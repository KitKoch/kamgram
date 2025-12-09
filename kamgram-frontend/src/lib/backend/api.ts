import { INewUser, IUser, INewPost, IBackendPost, IUpdateMe, IUpdatePostBackend } from "@/types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

// ==================================================================================================================================
// USER QUERIES
// ==================================================================================================================================
// Register =========================================================================================================================
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

// Login ============================================================================================================================
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

// Get Current User =================================================================================================================
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

// Update Current User ==============================================================================================================
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

// Logout ===========================================================================================================================
export async function signOutBackend(): Promise<void> {
    const res = await fetch(`${API_URL}/auth/logout`, {
        method: "POST",
        credentials: "include",
    });

    if(!res.ok && res.status !== 204) {
        throw new Error("Failed to sign out");
    };
};

// ==================================================================================================================================
// POST QUERIES
// ==================================================================================================================================
// Create Post ======================================================================================================================
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

// Recent Posts =====================================================================================================================
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

// Get Post by ID ===================================================================================================================
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

// Update Post ======================================================================================================================
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
}

// ==================================================================================================================================
// FILE QUERIES
// ==================================================================================================================================
// File upload ======================================================================================================================
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