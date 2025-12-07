export type NewUser = {
    name: string;
    email: string;
    username: string;
    password: string;
};

export type UserDTO = {
    id: string;
    name: string;
    username: string,
    email: string;
    imageUrl: string | null;
    bio: string | null;
};

export type PostDTO = {
    id: string;
    caption: string;
    imageUrl: string | null;
    location: string | null;
    tags: string[]; //parse comma separated DB string into array
    createdAt: string; //ISO string
    creator: UserDTO;
    likeCount: number;
    saveCount: number;
    isLikedByMe: boolean;
    isSavedByMe: boolean;
}