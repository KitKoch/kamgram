import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NewUser, UserDTO, PostDTO } from "./types";

const app = express();

//Make sure to have a connection string
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
    });
};

//Root route to avoid "Cannot GET /"
app.get("/", (_req, res) => {
    res.send("kamgram backend is running!");
});

// Simple health check
app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});

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
    }
}

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

        const user: UserDTO = {
            id: existing?.id,
            name: existing?.name,
            email: existing?.email,
            username: existing?.username,
            imageUrl: existing?.imageUrl,
            bio: existing?.bio,
        };
        
        return res.json({ user });
    } catch (error) {
        console.error("Error in /auth/me:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Temporary in-memory route for /auth/register (just to prove wiring)
app.post("/auth/register", async (req, res) => {
    try {
        const { name, email, username, password } = req.body as NewUser;

        if(!name || !email || !username || !password) {
            return res.status(400).json({ error: "Missing fields" });
        };

        // For now, echo back a fake user (Postgres later)
        // const fakeUser: UserDTO = {
        //     id: "fake_user123",
        //     name: "Fake",
        //     email: "fakeuser123@fake.com",
        //     username: "fake_user",
        //     imageUrl: "",
        //     bio: "test user",
        // };
        // return res.status(201).json({ user: fakeUser });

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
    });
    return res.status(204).end();
});

// Create a Post
app.post("/posts", async (req, res) => {
    try {
        const authUser = await getAuthUser(req);
        if(!authUser) {
            return res.status(401).json({ error: "Not authenticated" });
        };

        const { caption, location, tags } = req.body as {
            caption?: string;
            location?: string;
            tags?: string;
        };

        if(!caption) {
            return res.status(400).json({ error: "Caption is required" });
        };

        // For now we ignore file upload and just set imageUrl to empty string
        const created = await prisma.post.create({
            data: {
                caption,
                imageUrl: "",
                location: location || "",
                tags: tags || "",
                userId: authUser.id,
            },
            include: {
                user: true,
            },
        });

        const tagList = created.tags ? 
        created.tags.replace(/ /g, "").split(",").filter(Boolean) : []; // / /g is RegExp for spaces, so replace space with empty string

        const post: PostDTO = {
            id: created.id,
            caption: created.caption,
            imageUrl: created.imageUrl,
            location: created.location,
            tags: tagList,
            createdAt: created.createdAt.toISOString(),
            creator: {
                id: created.user.id,
                name: created.user.name,
                username: created.user.username,
                email: created.user.email,
                imageUrl: created.user.imageUrl ?? "",
                bio: created.user.bio ?? "",
            },
        };

        return res.status(201).json({ post });
    } catch (error) {
        console.error("Error in POST /posts:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// Get Recent Posts
app.get("/posts/recent", async (req, res) => {
    try {
        const limitParam = req.query.limit as string | undefined;
        const limit = limitParam ? parseInt(limitParam, 10) : 20;

        const posts = await prisma.post.findMany({
            orderBy: { createdAt: "desc" },
            take: limit,
            include: { user: true },
        });

        const mapped = posts.map<PostDTO>((p) => {
            const tagList = p.tags ? p.tags.replace(/ /g, "").split(",").filter(Boolean) : [];
            return {
                id: p.id,
                caption: p.caption,
                imageUrl: p.imageUrl,
                location: p.location,
                tags: tagList,
                createdAt: p.createdAt.toISOString(),
                creator: {
                    id: p.user.id,
                    name: p.user.name,
                    username: p.user.username,
                    email: p.user.email,
                    imageUrl: p.user.imageUrl ?? "",
                    bio: p.user.bio ?? "",
                },
            };
        });

        return res.json({ posts: mapped });
    } catch (error) {
        console.error("Error in GET /posts/recent:", error);
        return res.status(500).json({ error: "Internal server error" });
    };
});

// Get a Single Post
app.get("/posts/:id", async(req, res) => {
    try {
        const { id } = req.params;

        const p = await prisma.post.findUnique({
            where: { id },
            include: { user: true },
        });

        if(!p) {
            return res.status(404).json({ error: "Post not found" });
        };

        const tagList = p.tags ? p.tags.replace(/ /g, "").split(",").filter(Boolean) : [];

        const post: PostDTO = {
            id: p.id,
            caption: p.caption,
            imageUrl: p.imageUrl,
            location: p.location,
            tags: tagList,
            createdAt: p.createdAt.toISOString(),
            creator: {
                id: p.user.id,
                name: p.user.name,
                username: p.user.username,
                email: p.user.email,
                imageUrl: p.user.imageUrl ?? "",
                bio: p.user.bio ?? "",
            },
        };

        return res.json({ post });
    } catch (error) {
        console.error("Error in GET /posts/:id :", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`kamgram backend listening on http://localhost:${PORT}`);
});