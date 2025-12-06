import { useGetCurrentUser } from "@/lib/react-query/queries";
import React, { useState, useEffect } from "react";
import { useDeleteSavedPost, useLikePost, useSavePost } from "@/lib/react-query/queries";
import { Models } from "appwrite";
import { useLocation } from "react-router-dom";
import { checkIsLiked } from "@/lib/utils";
import Loader from "./Loader";

type PostStatsProps = {
    post?: Models.Document;
    userId: string;
}

const PostStats = ({ post, userId }: PostStatsProps) => {
    const location = useLocation();
    const likesList = post?.likes ? post.likes.map((user: Models.Document) => user.$id) : [];

    const [likes, setLikes] = useState<string[]>(likesList);
    const [isSaved, setIsSaved] = useState(false);

    const { mutate: likePost } = useLikePost();
    const { mutate: savePost, isLoading: isSavingPost } = useSavePost();
    const { mutate: deleteSavedPost, isLoading: isDeletingSaved } = useDeleteSavedPost();

    const { data: currentUser } = useGetCurrentUser();

    const savedPostRecord = currentUser?.save?.find((record: Models.Document) => record.post.$id === post?.$id);

    useEffect(() => {
        //setIsSaved(savedPostRecord ? true : false); OR BELOW
        setIsSaved(!!savedPostRecord); //Check if there is a truly value, if theres a truly value then it will be set to a falsy value and if falsy then truly value
    }, [currentUser])

    const handleLikePost = (e: React.MouseEvent) => {
        e.stopPropagation(); //if click like then it'll just like and not doing anything further like opening the post from clicking on the post
        
        let newLikes = [...likes];

        const hasLiked = newLikes.includes(userId);

        if(hasLiked) {
            newLikes = newLikes.filter((id) => id !== userId);
        } else {
            newLikes.push(userId);
        }

        setLikes(newLikes);
        likePost({ postId: post?.$id || '', likesArray: newLikes});
    }

    const handleSavePost = (e: React.MouseEvent) => {
        e.stopPropagation(); 

        if(savedPostRecord) {
            setIsSaved(false);
            return deleteSavedPost(savedPostRecord.$id);
        } 
        // else {
        //     savePost({ postId: post.$id, userId });
        //     setIsSaved(true);
        // }

        savePost({ postId: post?.$id || '', userId: userId });
        setIsSaved(true);
    };

    const containerStyles = location.pathname.startsWith("/profile") ? "w-full" : "";
  
    return (
    <div className={`flex justify-between items-center z-20 ${containerStyles}`}>
        <div className="flex gap-2 mr-5">
            <img 
                src={`${checkIsLiked(likes, userId) ? "/assets/icons/liked.svg" : "/assets/icons/like2.svg"}`}
                alt="like"
                width={20}
                height={20}
                onClick={handleLikePost}
                className="cursor-pointer"
            />
            <p className="small-medium lg:base-medium">{likes.length}</p>
        </div>

        <div className="flex gap-2">
            { isSavingPost || isDeletingSaved ? <Loader /> : <img 
                src={isSaved ? "/assets/icons/saved2.svg" : "/assets/icons/save2.svg"}
                alt="save"
                width={20}
                height={20}
                onClick={handleSavePost}
                className="cursor-pointer"
            /> }
        </div>
    </div>
  )
}

export default PostStats