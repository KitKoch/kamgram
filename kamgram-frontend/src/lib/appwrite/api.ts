import { INewPost, INewUser, IUpdatePost, IUpdateUser } from "@/types";
import { ID, Query } from "appwrite";
import { account, avatars, appwriteConfig, databases, storage } from "./config";

//Connection to user auth
//SIGN UP======================================================
export async function createUserAccount(user: INewUser) {
    try {
        const newAccount = await account.create(
            ID.unique(),
            user.email,
            user.password,
            user.name
        ); 

        if(!newAccount) throw Error;

        const avatarUrl = avatars.getInitials(user.name);

        const newUser = await saveUserToDB({
            accountId: newAccount.$id,
            name: newAccount.name,
            email: newAccount.email,
            username: user.username,
            imageUrl: avatarUrl,
        });
        return newUser;
    } catch (error) {
        console.log(error);
        return error;
    }
};

//Connection to db function
//SAVE USER TO DB======================================================
export async function saveUserToDB(user: {
    accountId: string;
    email: string;
    name: string;
    imageUrl: URL;
    username?: string;
}) {
    try {
        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            ID.unique(),
            user,
        );
        return newUser;
    } catch (error) {
        console.log(error);
    }
};

//SIGN IN======================================================
export async function signInAccount(user: {email: string; password: string}) {
    try {
        const session = await account.createEmailSession(user.email, user.password); //createEmailSession is another appwrite's method
        return session;
    } catch (error) {
        console.log(error);
    }
};

//SIGN OUT======================================================
export async function signOutAccount() {
    try {
        const session = await account.deleteSession("current"); //deleteSession is an Appwrite's method
        return session;
    } catch (error) {
        console.log(error);
    }
};

//GET ACCOUNT======================================================
export async function getAccount() {
    try {
        const currentAccount = await account.get();
        return currentAccount;
    } catch (error) {
        console.log(error);
    }
};

//GET CURRENT USER======================================================
export async function getCurrentUser() {
    try {
        const currentAccount = await getAccount();

        if(!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            [Query.equal('accountId', currentAccount.$id)]
        )

        if(!currentUser) throw Error;

        return currentUser.documents[0];
    } catch (error) {
        console.log(error);
        return null;
    }
};

//================================================================
//POST QUERIES
//================================================================

//CREATE POST======================================================
export async function createPost(post: INewPost) {
    try {
        //upload file to appwrite storage
        const uploadedFile = await uploadFile(post.file[0]); //first post (0)

        if(!uploadedFile) throw Error;

        //Else get file url
        const fileUrl = getFilePreview(uploadedFile.$id);

        //console.log({fileUrl}); //Test

        if(!fileUrl) {
            await deleteFile(uploadedFile.$id); //delete prev file because it might be corrupted
            throw Error;
        }

        //convert tags into an array
        const tags = post.tags?.replace(/ /g, '').split(',') || []; //replace all spaces with empty strings, then split with a comma

        //save post into db
        const newPost = await databases.createDocument(
            appwriteConfig.databaseId, //database ID to be updated
            appwriteConfig.postCollectionId, //collection ID to be updated
            ID.unique(), //define unique ID
            { //Entire object containing all the data about the post
                creator: post.userId,
                caption: post.caption,
                imageUrl: fileUrl,
                imageId: uploadedFile.$id,
                location: post.location,
                tags: tags,
            }
        )

        if(!newPost) {
            await deleteFile(uploadedFile.$id);
            throw Error;
        }

        return newPost;
    } catch (error) {
        console.log(error);
    }
};

//UPLOAD FILE======================================================
export async function uploadFile(file: File) {
    try {
        const uploadedFile = await storage.createFile( //for saving media
            appwriteConfig.storageId,
            ID.unique(),
            file
        );

        return uploadedFile;
    } catch (error) {
        console.log(error);
    }
};

//GET FILE URL======================================================
export function getFilePreview(fileId: string) {
    try {
        const fileUrl = storage.getFilePreview(
            appwriteConfig.storageId,
            fileId,
            2000, //width
            2000, //height
            "top", //gravity: where is it going to show
            100, //quality
        );

        if(!fileUrl) throw Error;

        return fileUrl;
    } catch (error) {
        console.log(error);
    }   
};

//DELETE FILE======================================================
export async function deleteFile(fileId: string) {
    try {
        await storage.deleteFile(appwriteConfig.storageId, fileId);

        return { status: 'ok'};
    } catch (error) {
        console.log(error);
    }
};

//GET RECENT POSTS======================================================
export async function getRecentPosts() {
    const posts = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.postCollectionId,
        [Query.orderDesc('$createdAt'), Query.limit(20)]
    )

    if(!posts) throw Error;
    return posts;
};

//LIKE POST======================================================
export async function likePost(postId: string, likesArray: string[]) {
    try {
        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId,
            {
                likes: likesArray
            }
        )

        if(!updatedPost) throw Error;

        return updatedPost;
    } catch (error) {
        console.log(error);
    }
};

//SAVE POST======================================================
export async function savePost(userId: string, postId: string) {
    try {
        const updatedPost = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            ID.unique(),
            {
                user: userId,
                post: postId,
            }
        );

        if(!updatedPost) throw Error;

        return updatedPost;
    } catch (error) {
        console.log(error);
    }
};

//DELETE SAVED POST======================================================
export async function deleteSavedPost(savedRecordId: string) {
    try {
        const statusCode = await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.savesCollectionId,
            savedRecordId,
        )

        if(!statusCode) throw Error;

        return { status: "Ok" };
    } catch (error) {
        console.log(error);
    }
};

//GET USERS======================================================
export async function getUsers(limit?: number) {
    const queries: any[] = [Query.orderDesc("$createdAt")];

    if(limit) {
        queries.push(Query.limit(limit));
    }

    try {
        const users = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            queries
        );

        if(!users) throw Error;

        return users;
    } catch (error) {
        console.log(error);
    }
};

//GET USER BY ID======================================================
export async function getUserById (userId: string) {
    try {
        const user = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userId,
        );

        if(!user) throw Error;
        return user;
    } catch(error) {
        console.log(error);
    }
};

//GET POST BY ID======================================================
export async function getPostById(postId: string) {
    try {
        const post = await databases.getDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId,
        )
        return post;
    } catch (error) {
        console.log(error);
    }
};

//UPDATE POST======================================================
export async function updatePost(post: IUpdatePost) {
    const hasFileToUpdate = post.file.length > 0;

    try {

        let image = {
            imageUrl: post.imageUrl,
            imageId: post.imageId,
        }

        if(hasFileToUpdate) {
            //Upload image to storage
            const uploadedFile = await uploadFile(post.file[0]); 
            if(!uploadedFile) throw Error;

            //Get file URL
            const fileUrl = getFilePreview(uploadedFile.$id);

            if(!fileUrl) {
                await deleteFile(uploadedFile.$id);
                throw Error;
            }

            image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id }

            
        }

        //Convert tags in an array
        const tags = post.tags?.replace(/ /g, '').split(',') || []; 

        //Update post in database
        const updatedPost = await databases.updateDocument(
            appwriteConfig.databaseId, 
            appwriteConfig.postCollectionId, 
            post.postId,
            { 
                caption: post.caption,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
                location: post.location,
                tags: tags,
            }
        )

        if(!updatedPost) {
            await deleteFile(post.imageId);
            throw Error;
        }

        return updatedPost;
    } catch (error) {
        console.log(error);
    }
}

//DELETE POST======================================================
export async function deletePost(postId: string, imageId: string) {
    if(!postId || !imageId) throw Error;

    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            postId,
        )

        return { status: 'Ok' };
    } catch (error) {
        console.log(error);
    }
}

//GET INFINITE POSTS======================================================
export async function getInfinitePosts({ pageParam } : { pageParam: number}) {
    const queries: any[] = [Query.orderDesc('$updatedAt'), Query.limit(10)]

    if(pageParam) {
        queries.push(Query.cursorAfter(pageParam.toString()));
    }

    try {
        const posts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            queries,
        )

        if(!posts) throw Error;

        return posts;

    } catch (error) {
        console.log(error);
    }
};

//SEARCH POSTS======================================================
export async function searchPosts(searchTerm: string) {
    try {
        const searchedPosts = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.postCollectionId,
            [Query.search('caption', searchTerm)],
        )

        if(!searchedPosts) throw Error;

        return searchedPosts;

    } catch (error) {
        console.log(error);
    }
}

//UPDATE USER======================================================
export async function updateUser(user: IUpdateUser) {
    const hasFileToUpdate = user.file.length > 0;

    try{
        let image = {
            imageUrl: user.imageUrl,
            imageId: user.imageId,
        };

        if(hasFileToUpdate) {
            //Upload new file to appwrite storage
            const uploadedFile = await uploadFile(user.file[0]);
            if(!uploadedFile) throw Error;

            //Get new file url
            const fileUrl = getFilePreview(uploadedFile.$id);
            if(!fileUrl) {
                await deleteFile(uploadedFile.$id);
                throw Error;
            }

            image = { ...image, imageUrl: fileUrl, imageId: uploadedFile.$id };
        }

        //update user
        const updatedUser = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            user.userId,
            {
                name: user.name,
                bio: user.bio,
                imageUrl: image.imageUrl,
                imageId: image.imageId,
            }
        );

        //Failed to update
        if(!updatedUser) {
            //Delete new file that has been updated recently
            if(hasFileToUpdate) {
                await deleteFile(image.imageId);
            }
            //If no new file uploaded, throw error
            throw Error;
        }

        //Delete old file after successful update
        if(user.imageId && hasFileToUpdate) {
            await deleteFile(user.imageId);
        }
        return updatedUser;
    } catch (error) {
        console.log(error);
    }
}
