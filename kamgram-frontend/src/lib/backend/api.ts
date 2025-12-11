import { INewUser, IUser, INewPost, IBackendPost, IUpdateMe, IUpdatePostBackend } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// ==================================================================================================================================
// USER & AUTH QUERIES
// ==================================================================================================================================
// REGISTER =========================================================================================================================
export async function createUserAccountBackend(user: INewUser): Promise<IUser> {
    const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(user),
    });

    if(!res.ok) {
        //Later parse JSON error message here
        throw new Error("Failed to create user");
    };

    const data = await res.json();
    return data.user as IUser;
}

// LOGIN ============================================================================================================================
export type SignInPayload = {
    emailOrUsername: string;
    password: string;
};

export async function signInBackend(payload: SignInPayload): Promise<IUser> {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
    });

    if(!res.ok) {
        //Later you can parse JSON error and show better message
        throw new Error("Failed to login");
    };

    const data = await res.json();
    return data.user as IUser;
};

// GET CURRENT USER =================================================================================================================
export async function getCurrentUserBackend(): Promise<IUser | null> {
    const res = await fetch(`${API_URL}/auth/me`, {
        method: "GET",
        credentials: "include",
    });

    if(res.status == 401) {
        return null;
    };

    if(!res.ok) {
        throw new Error("Failed to fetch current user");
    };

    const data = await res.json();
    return data.user as IUser;
};

// UPDATE CURRENT USER ==============================================================================================================
export async function updateMeBackend(payload: IUpdateMe): Promise <IUser> {
    const res = await fetch(`${API_URL}/users/me`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(payload),
    });
    if(!res.ok) throw new Error("Failed to update profile");
    const data = await res.json();
    return data.user as IUser;
};

// LOGOUT ===========================================================================================================================
export async function signOutBackend(): Promise<void> {
    const res = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
    });

    if(!res.ok && res.status !== 204) {
        throw new Error("Failed to sign out");
    };
};

// GET USERS ========================================================================================================================
export async function getUsersBackend(limit = 20): Promise<IUser[]> {
    const url = new URL(`${API_URL}/users`);
    url.searchParams.set("limit", String(limit));

    const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
    });

    if(!res.ok) {
        throw new Error("Failed to fetch users");
    };

    const data = await res.json();
    return data.users as IUser[];
};

// GET USER BY ID ===================================================================================================================
export async function getUserByIdBackend(userId: string): Promise<IUser> {
    const res = await fetch(`${API_URL}/users/${userId}`, {
        method: "GET",
        credentials: "include"
    });

    if(res.status === 404) {
        throw new Error("User not found");
    };

    if(!res.ok) {
        throw new Error("Failed to get user");
    };

    const data = await res.json();
    return data.user as IUser;
};

// ==================================================================================================================================
// POST QUERIES
// ==================================================================================================================================
// CREATE POST ======================================================================================================================
export async function createPostBackend(post: INewPost): Promise<IBackendPost> {
    let imageUrl = "";

    // INewPost has file: File[]
    if(post.file && post.file.length > 0) {
        imageUrl = await uploadFileBackend(post.file[0]);
    };
    
    const res = await fetch(`${API_URL}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
            caption: post.caption,
            location: post.location ?? "",
            tags: post.tags ?? "",
            imageUrl,
        }),
    });

    if(!res.ok) {
        throw new Error("Failed to create post");
    };

    const data = await res.json();
    return data.post as IBackendPost;
};

// GET RECENT POSTS =================================================================================================================
export async function getRecentPostBackend(): Promise<IBackendPost[]> {
    const res = await fetch(`${API_URL}/posts/recent?limit=20`, {
        method: "GET",
        credentials: "include",
    });

    if(!res.ok) {
        throw new Error("Failed to fetch recent posts");
    };

    const data = await res.json();
    return data.posts as IBackendPost[];
};

// GET INFINITE POSTS ==============================================================================================================
export async function getInfinitePostsBackend(cursor?: string, limit = 10) {
    const url = new URL(`${API_URL}/posts`);
    url.searchParams.set("limit", String(limit)); // add limit (always)
    if(cursor) {
        url.searchParams.set("cursor", cursor); // add cursor (if you have one)
    };

    const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
    });

    if(!res.ok) {
        throw new Error("Failed to fetch posts");
    };

    return res.json() as Promise<{ posts: IBackendPost[]; nextCursor: string | null }>; // { posts, nextCursor }
};

// SEARCH POSTS =====================================================================================================================
export async function searchPostsBackend(q: string): Promise<IBackendPost[]> {
    const url = new URL(`${API_URL}/posts/search`);
    url.searchParams.set("q", q);

    const res = await fetch(url.toString(), {
        method: "GET",
        credentials: "include",
    });

    if(!res.ok) {
        throw new Error("Failed to search");
    };

    const data = await res.json();
    return data.posts as IBackendPost[];
}

// GET POST BY ID ===================================================================================================================
export async function getPostByIdBackEnd(postId: string): Promise<IBackendPost> {
    const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "GET",
        credentials: "include",
    });

    if(res.status === 404) {
        throw new Error("Post not found");
    };

    if(!res.ok) {
        throw new Error("Failed to get post");
    };

    const data = await res.json();
    return data.post as IBackendPost;
};

// UPDATE POST ======================================================================================================================
export async function updatePostBackend(postId: string, payload: IUpdatePostBackend): Promise<IBackendPost> {
    const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json"},
        credentials: "include",
        body: JSON.stringify(payload),
    });
    
    if(!res.ok) {
        throw new Error("Failed to update post");
    };

    const data = await res.json();
    return data.post as IBackendPost;
};

// DELETE POST ======================================================================================================================
export async function deletePostBackend(postId: string): Promise<Boolean> {
    const res = await fetch(`${API_URL}/posts/${postId}`, {
        method: "DELETE",
        credentials: "include",
    });

    if(!res.ok && res.status !== 204) {
        throw new Error("Failed to delete post");
    };
    return true as Boolean;
};

// ==================================================================================================================================
// LIKE/SAVE QUERIES
// ==================================================================================================================================
// LIKE POST ========================================================================================================================
export async function likePostBackend(postId: string): Promise<void> {
    const res = await fetch(`${API_URL}/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
    });
    if(!res.ok && res.status !== 204) {
        throw new Error("Failed to like post");
    };
};

// UNLIKE POST ======================================================================================================================
export async function unlikePostBackend(postId: string): Promise<void> {
    const res = await fetch(`${API_URL}/posts/${postId}/like`, {
        method: "DELETE",
        credentials: "include",
    });
    if(!res.ok && res.status !== 204) {
        throw new Error("Failed to unlike post");
    };
};

// SAVE POST ========================================================================================================================
export async function savePostBackend(postId: string): Promise<void> {
    const res = await fetch(`${API_URL}/posts/${postId}/save`, {
        method: "POST",
        credentials: "include",
    });
    if(!res.ok && res.status !== 204) {
        throw new Error("Failed to save post");
    };
};

// UNSAVE POST ======================================================================================================================
export async function unsavePostBackend(postId: string): Promise<void> {
    const res = await fetch(`${API_URL}/posts/${postId}/save`, {
        method: "DELETE",
        credentials: "include",
    });
    if(!res.ok && res.status !== 204) {
        throw new Error("Failed to unsave post");
    };
};

// ==================================================================================================================================
// FILE QUERIES
// ==================================================================================================================================
// FILE UPLOAD ======================================================================================================================
export async function uploadFileBackend(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch(`${API_URL}/uploads`, {
        method: "POST",
        body: form,
        credentials: "include",
    });

    if(!res.ok) {
        throw new Error("Failed to upload file");
    };

    const data = await res.json();
    return data.url as string;
}