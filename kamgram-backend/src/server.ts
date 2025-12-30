import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NewUser, UserDTO, PostDTO } from "./types";
import multer from "multer";

const app = express();

// ========================================================================================================================================================
// AUTH
// ========================================================================================================================================================
// Make sure to have a connection string
const connectionString = process.env.DATABASE_URL;
if(!connectionString) {
    throw new Error("DATABASE_URL is not set in .env");
}

// Prisma 7: need a driver adapter for Postgres
const adapter = new PrismaPg( {connectionString} );
const prisma = new PrismaClient( {adapter} );

// Middlewares: CORS + body parsing
app.use(
    cors({
        origin: "http://localhost:5173", 
        credentials: true,
    })
);
app.use(express.json());
app.use(cookieParser());

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

function signAuthToken(userId: string) {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

function setAuthCookie(res: express.Response, token: string) {
    res.cookie("kamgram_token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false, //set true in prod with HTTPS
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: "/",
    });
};

// Root route to avoid "Cannot GET /"
app.get("/", (_req, res) => {
    res.send("kamgram backend is running!");
});

// Simple health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

// Helper 1:
function toUserDTO(u: any) {
    return {
        id: u.id,
        name: u.name,
        username: u.username,
        email: u.email,
        imageUrl: u.imageUrl ?? "",
        bio: u.bio ?? "",
    };
};

// Helper 2:
function toPostDTO(post: any, authUserId?: string) {
    const tagList = post.tags ? post.tags.replace(/ /g, "").split(",").filter(Boolean) : [];

    const likes = (post.likes ?? []).map((like: any) => ({
        id: like.id,
        createdAt: like.createdAt.toISOString(),
        user: toUserDTO(like.user),
    }));

    const isLikedByMe = authUserId ? (post.likes ?? []).some((like: any) => like.userId === authUserId) : false;
    const isSavedByMe = authUserId ? (post.saves ?? []).some((save: any) => save.userId === authUserId) : false;

    return {
        id: post.id,
        caption: post.caption,
        imageUrl: post.imageUrl,
        location: post.location,
        tags: tagList,
        createdAt: post.createdAt.toISOString(),
        creator: toUserDTO(post.user),
        likeCount: post._count?.likes ?? likes.length,
        saveCount: post._count?.saves ?? 0,
        likes,
        isLikedByMe,
        isSavedByMe,
    };
};

// Avoid copying token logic => small helper to get logged in user:
async function getAuthUser(req: express.Request) {
    const token = req.cookies?.kamgram_token as string | undefined;
    if(!token) {
        return null;
    }
    try {
        const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
        const user = await prisma.user.findUnique({ where: { id: payload.userId } });
        return user;
    } catch {
        return null;
    };
};

// Register
app.post("/auth/register", async (req, res) => {
    try {
        const { name, email, username, password } = req.body as NewUser;

        if(!name || !email || !username || !password) {
            return res.status(400).json({ error: "Missing fields" });
        };

        const existing = await prisma.user.findFirst({
            where: {
                OR: [{ email }, { username }],
            },
        });

        if(existing) {
            return res.status(409).json({ error: "Email or username alrady in use" });
        };

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10); //10 is cost factor/salt rounds => higher = more secure

        // Create user in DB
        const created = await prisma.user.create({
            data: {
                name,
                email,
                username,
                password: hashedPassword,
                imageUrl: "",
                bio: "",
            }
        });

        const user: UserDTO = {
            id: created.id,
            name: created.name,
            email: created.email,
            username: created.username,
            imageUrl: created.imageUrl,
            bio: created.bio,
        };

        const token = signAuthToken(user.id);
        setAuthCookie(res, token);

        return res.status(201).json({ user });
    } catch (error) {
        console.error("Error in /auth/register:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Login
app.post("/auth/login", async (req, res) => {
    try {
        const { emailOrUsername, password } = req.body as {
            emailOrUsername: string;
            password: string;
        };

        if(!emailOrUsername || !password) {
            return res.status(400).json({ error: "Missing credentials" })
        };

        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: emailOrUsername },
                    { username: emailOrUsername },
                ],
            },
        });

        if(!existing) {
            return res.status(401).json({ error: "Invalid credentials" });
        };

        const ok = await bcrypt.compare(password, existing.password);
        if(!ok) {
            return res.status(401).json({ error: "Invalid credentials" });
        };

        const user: UserDTO = {
            id: existing.id,
            name: existing.name,
            email: existing.email,
            username: existing.username,
            imageUrl: existing.imageUrl,
            bio: existing.bio,
        };

        const token = signAuthToken(user.id);
        setAuthCookie(res, token);

        return res.json({ user });
    } catch (error) {
        console.error("Error in /auth/login:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Logout
app.post("/auth/logout", (req, res) => {
    res.clearCookie("kamgram_token", {
        httpOnly: true,
        sameSite: "lax",
        secure: false, // true in prod with HTTPS
        path: "/",
    });
    return res.status(204).end();
});

// ========================================================================================================================================================
// USER
// ========================================================================================================================================================
// Current User
app.get("/auth/me", async (req, res) => {
    try {
        const token = req.cookies?.kamgram_token as string | undefined;

        if(!token) {
            return res.status(401).json({ error: "Not authenticated" });
        }

        let payload: { userId: string };
        try {
            payload = jwt.verify(token, JWT_SECRET) as { userId: string };
        } catch {
            return res.status(401).json({ error: "Invalid token" });
        }

        const existing = await prisma.user.findUnique({
            where: { id: payload.userId },
        });

        if (!existing) {
            return res.status(401).json({ error: "User not found" });
        };

        // UI used to expect Appwrite style "saved post"
        // Not a mimic of that yet, but this should give backend
        // capable of giving the data for now
        const saves = await prisma.save.findMany({
            where: { userId: existing.id },
            select: { postId: true },
        })

        const user: UserDTO = {
            id: existing?.id,
            name: existing?.name,
            email: existing?.email,
            username: existing?.username,
            imageUrl: existing?.imageUrl,
            bio: existing?.bio,
        };
        
        return res.json({ 
            user,
            savedPostIds: saves.map(s => s.postId), //simplied version of retrieving for now 
        });
    } catch (error) {
        console.error("Error in /auth/me:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Update Current User (Profile + Avatar Upload)
app.patch("/users/me", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated"} );

        // Read fields from body
        const { name, bio, imageUrl} = req.body as {
            name?: string;
            bio?: string;
            imageUrl?: string;
        };

        const updated = await prisma.user.update({
            where: { id: authUser.id },
            data: {
                ...(name !== undefined ? { name } : {}),
                ...(bio !== undefined ? { bio } : {}),
                ...(imageUrl !== undefined ? { imageUrl } : {}),
            },
        });

        const user = {
            id: updated.id,
            name: updated.name,
            email: updated.email,
            username: updated.username,
            imageUrl: updated.imageUrl ?? "",
            bio: updated.bio ?? "",
        };

        return res.json({ user });
    } catch (error) {
        console.error("Error in PATCH /users/me:", error);
        return res.status(500).json({ error: "Internal server error"} );
    };
});

// Get Users
app.get("/users", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated" });

        const limitParam = req.query.limit as string | undefined;
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;

        const users = await prisma.user.findMany({
            take: limit,
            orderBy: { createdAt: "desc" },
            select: {
                id: true,
                name: true,
                username: true,
                email: true,
                imageUrl: true,
                bio: true,
            },
        });
        return res.json({ users });
    } catch (error) {
        console.error("Error in GET /users:", error);
        return res.status(500).json({ error: "Internal server error"} );
    };
});

// Get User by Id
app.get("/users/:id", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated" });

        const { id } = req.params;

        const user = await prisma.user.findUnique({
            where: { id },
            select: {
                id: true,
                name: true,                
                username: true,
                email: true,
                imageUrl: true,
                bio: true,
            },
        });

        if(!user) { 
            return res.status(404).json({ error: "User not found" }) 
        };

        return res.json({ user });
    } catch (error) {
        console.error("Error in GET /users/:id", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// ========================================================================================================================================================
// POST
// ========================================================================================================================================================
// Get Recent Posts
app.get("/posts/recent", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        const limitParam = req.query.limit as string | undefined;
        const limit = limitParam ? parseInt(limitParam, 10) : 20;

        const posts = await prisma.post.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { 
                user: true,
                likes: {
                    include: { user: true},
                    orderBy: { createdAt: "desc"},
                },
                _count: { select: { likes: true, saves: true} },
                ...(authUser ? { saves: { where: { userId: authUser.id } } } : {}),
            },
        });

        const mapped = posts.map((post) => toPostDTO(post, authUser?.id));
        return res.json({ posts: mapped });
    } catch (error) {
        console.error("Error in GET /posts/recent:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Search Posts
app.get("/posts/search", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated" });
        
        const q = (req.query.q as string | undefined)?.trim(); //takes q from query string and trim for search
        if(!q) {
            return res.json({ posts: [] }); // No usable search term so empty result
        };

        // return a post if any of these fields (caption, tags, location) contains "q" and its case insensitive
        const posts = await prisma.post.findMany({
            where: {
                OR: [
                    { caption: { contains: q, mode: "insensitive" } }, 
                    { tags: { contains: q, mode: "insensitive" } },
                    { location: { contains: q, mode: "insensitive"} },
                ],
            },
            orderBy: { createdAt: "desc" },
            take: 50,
            include: {
                user: true,
                likes: {
                    include: { user: true },
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { likes: true, saves: true } },
                ...(authUser ? { saves: { where: { userId: authUser.id } } } : {}),
            },
        });

        const mapped = posts.map((post) => toPostDTO(post, authUser?.id));
        return res.json({ posts: mapped });
    } catch(error) {
        console.error("Error in GET /posts/search:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Get Infinite Posts
app.get("/posts", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({error: "Not authenticated"});

        const limitParam = req.query.limit as string | undefined;
        const cursor = req.query.cursor as string | undefined;
        const userId = req.query.userId as string | undefined;
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

        const posts = await prisma.post.findMany({
            take: limit + 1, // one extra post so can detect if theres another page
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), // skip 1 to avoid including the cursor item again
            ...(userId ? { where: { userId } } : {}),
            orderBy: { createdAt: "desc" },
            include: {
                user: true,
                likes: {
                    include: { user: true },
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { likes: true, saves: true } },
                ...(authUser ? { saves: { where: { userId: authUser.id } } } : {}),
            },
        });

        const hasNext = posts.length > limit;
        const page = hasNext ? posts.slice(0, limit) : posts;
        const nextCursor = hasNext ? page[page.length - 1]?.id : null;
        
        const mapped = page.map((post) => toPostDTO(post, authUser?.id)); 
        return res.json({ posts: mapped, nextCursor });
    } catch(error) {
        console.error("Error in GET/posts:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Get Like from Post
app.get("/posts/:id/likes", async(req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated" });

        const postId = req.params.id;

        const limitParam = req.query.limit as string | undefined;
        const cursor = req.query.cursor as string | undefined;
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 20;

        // ensure post exists
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if(!post) {
            return res.status(404).json({ error: "Post not found" });
        };
        const likes = await prisma.like.findMany({
            where: { postId },
            orderBy: { createdAt: "desc" },
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1} : {}),
            include: { user: true },
        });

        const hasNext = likes.length > limit;
        const page = hasNext ? likes.slice(0, limit) : likes;
        const nextCursor = hasNext ? page[page.length - 1]?.id : null;

        const mapped = page.map((like) => ({
            id: like.id,
            createdAt: like.createdAt.toISOString(),
            user: {
                id: like.user.id,
                name: like.user.name,
                username: like.user.username,
                email: like.user.email,
                imageUrl: like.user.imageUrl ?? "",
                bio: like.user.bio ?? "",
            },
        }));
        return res.json({ likes: mapped, nextCursor });
    } catch(error) {
        console.error("Error in GET /posts/:id/likes:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Get a Single Post
app.get("/posts/:id", async(req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated" });

        const { id } = req.params;

        const p = await prisma.post.findUnique({
            where: { id },
            include: { 
                user: true,
                likes: {
                    include: { user: true },
                    orderBy: { createdAt: "desc"},
                },
                _count: { select: { likes: true, saves: true }},
                ...( authUser ? { saves: { where: { userId: authUser.id } } } : {}),
            },
        });

        if(!p) {
            return res.status(404).json({ error: "Post not found" });
        };

        const post = toPostDTO(p, authUser?.id);
        return res.json({ post });
    } catch (error) {
        console.error("Error in GET /posts/:id :", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Create a Post
app.post("/posts", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) {
            return res.status(401).json({ error: "Not authenticated" });
        };

        const { caption, location, tags, imageUrl } = req.body as {
            caption?: string;
            location?: string;
            tags?: string;
            imageUrl?: string;
        };

        if(!caption) {
            return res.status(400).json({ error: "Caption is required" });
        };

        // For now we ignore file upload and just set imageUrl to empty string
        const created = await prisma.post.create({
            data: {
                caption,
                imageUrl: imageUrl ?? "",
                location: location || "",
                tags: tags || "",
                userId: authUser.id,
            },
            include: {
                user: true,
                likes: {
                    include: { user: true },
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { likes: true, saves: true }},
                ...(authUser ? { saves: { where: { userId: authUser.id } } } : {}),
            },
        });

        const post = toPostDTO(created, authUser?.id);
        return res.status(201).json({ post });
    } catch (error) {
        console.error("Error in POST /posts:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Update a Post
app.patch("/posts/:id", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated" });

        const postId = req.params.id;

        // Check if post exists
        const existing = await prisma.post.findUnique({
            where: { id: postId },
        });
        if(!existing) {
            return res.status(404).json({ error: "Post not found" });
        };

        // Ownership check 
        if(existing.userId !== authUser.id) {
            return res.status(403).json({ error: "Not allowed" });
        };

        // Read fields from the body
        const { caption, location, tags, imageUrl } = req.body as {
            caption?: string,
            location?: string,
            tags?: string;
            imageUrl?: string;
        };

        // Allow partial updates
        const updated = await prisma.post.update({
            where: { id: postId },
            data: {
                ...(caption !== undefined ? { caption } : {}),
                ...(location !== undefined ? { location } : {}),
                ...(tags !== undefined ? { tags } : {}),
                ...(imageUrl !== undefined ? { imageUrl } : {}),
            },
            include: {
                user: true,
                likes: {
                    include: { user: true },
                    orderBy: { createdAt: "desc" },
                },
                _count: { select: { likes: true, saves: true} },
                ...(authUser ? { saves: { where: { userId: authUser.id } } } : {}),
            },
        });

        const updatedPost = toPostDTO(updated, authUser?.id);
        return res.status(200).json({ post: updatedPost });       
    } catch(error) {
        console.error("Error in PATCH /posts/:id:", error);
        return res.status(500).json({ error: "Internal Server Error"});
    };
});

// Delete a Post
app.delete("/posts/:id", async(req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated"});

        // Get post Id
        const postId = req.params.id;

        // Check if post exists
        const existing = await prisma.post.findUnique({
            where: { id: postId },
        });
        if(!existing) {
            return res.status(404).json({ error: "Post not found"});
        };

        //Check ownership
        if(existing.userId !== authUser.id) {
            return res.status(403).json({ error: "Not allowed"});
        };

        // Clean relations first (with like and save)
        await prisma.like.deleteMany({ where: { postId } });
        await prisma.save.deleteMany({ where: { postId } });

        // Delete post
        await prisma.post.delete({ where: { id: postId } });
        return res.status(204).end();
    } catch(error) {
        console.error("Error in DELETE /posts/:id", error);
        return res.status(500).json({ error: "Internal server error"});
    };
});

// ========================================================================================================================================================
// LIKE
// ========================================================================================================================================================
// Like a Post
app.post("/posts/:id/like", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) {
            return res.status(401).json( {error: "Not authenticated"} );
        };

        const postId = req.params.id;

        //Ensure post exists
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if(!post) return res.status(404).json({ error: "Post not found"});

        await prisma.like.upsert({
            where: {
                userId_postId: { userId: authUser.id, postId },
            },
            update: {},
            create: { userId: authUser.id, postId },
        });

        return res.status(204).end();
    } catch(error) {
        console.error("POST /posts/:id/like", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Delete Liked Post (Hard Delete)
app.delete("/posts/:id/like", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) {
            return res.status(401).json({ error: "Not authenticated" });
        };

        const postId = req.params.id;

        await prisma.like.deleteMany({
            where: { userId: authUser.id, postId },
        });
        return res.status(204).end();
    } catch (error) {
        console.error("DELETE /posts/:id/like", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Get Like Post(s)
app.get("/users/me/liked", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) {
            return res.status(401).json({ error: "Not authenticated" });
        };

        const limitParam = req.query.limit as string | undefined;
        const cursor = req.query.cursor as string | undefined;
        const limit = limitParam ? Math.min(parseInt(limitParam, 10), 50) : 10;

        const myLikedPosts = await prisma.like.findMany({
            take: limit + 1,
            ...(cursor ? { cursor: { id: cursor }, skip: 1} : {}),
            where: { userId: authUser.id },
            orderBy: { createdAt: "desc" },
            include: {
                post: {
                    include: {
                        user: true,
                        likes: { include: { user: true }, orderBy: { createdAt: "desc" } },
                        _count: { select: { likes: true, saves: true } },
                        saves: { where: { userId: authUser.id } },
                    },
                },
            },
        });

        /* Sample post
            {
                id: "like123",
                userId: "me",
                postId: "post123",
                createdAt: "...",
                post: {
                    id: "post123",
                    caption: "...",
                    user: { ...author... },
                    likes: { ...list of users who like it... },
                    _count: { likes: 42, saves: 3 },
                    saves: [ ...only my save record if I saved it... ],
                }
            }
        */

        const hasNext = myLikedPosts.length > limit;
        const page = hasNext ? myLikedPosts.slice(0, limit) : myLikedPosts;
        const nextCursor = hasNext ? page[page.length - 1]?.id : null;

        const posts = page.map((myLikePost) => toPostDTO(myLikePost.post, authUser?.id));
        return res.json({ posts, nextCursor });

    } catch (error) {
        console.error("GET /users/me/liked", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// ========================================================================================================================================================
// SAVE
// ========================================================================================================================================================
// Save a Post
app.post("/posts/:id/save", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) {
            return res.status(401).json({ error: "Not authenticated" });
        };

        const postId = req.params.id;

        // Check if post exists
        const post = await prisma.post.findUnique({ where: { id: postId } });
        if(!post) return res.status(404).json({ error: "Post not found" });

        await prisma.save.upsert({
            where: {
                userId_postId: { userId: authUser.id, postId },
            },
                update: {},
                create: { userId: authUser.id, postId},
        });

        return res.status(204).end();
    } catch (error) {
        console.error("POST /posts/:id/save", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Delete a Saved Post
app.delete("/posts/:id/save", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) return res.status(401).json({ error: "Not authenticated" });

        const postId = req.params.id;
        await prisma.save.deleteMany({
            where: { userId: authUser.id, postId },
        });

        return res.status(204).end();
    } catch (error) {
        console.error("DELETE /posts/:id/save", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// ========================================================================================================================================================
// FILE
// ========================================================================================================================================================
// Static file hosting for upload
// Any file in /uploads is accessible at http://localhost:4000/uploads/<filename>
app.use("/uploads", express.static("uploads")); 

// Upload route
const storage = multer.diskStorage({
    destination: "uploads/",
    filename: (_req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${unique}-${file.originalname}`);
    },
});
const upload = multer({ storage });
app.post("/uploads", upload.single("file"), (req, res) => {
    if(!req.file) { 
        return res.status(400).json({ error: "No file uploaded"}); 
    };

    const url = `http://localhost:4000/uploads/${req.file.filename}`;
    return res.status(201).json({ url });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`kamgram backend listening on http://localhost:${PORT}`);
});