import { useGetCurrentUser } from "@/lib/react-query/queries";
import React, { useState } from "react";
import { useLikePost, useSavePost } from "@/lib/react-query/queries";
import { useLocation } from "react-router-dom";
import { checkIsLiked } from "@/lib/utils";
import { IBackendPost} from "@/types";

type PostStatsProps = {
    post?: IBackendPost;
    userId: string;
}

const PostStats = ({ post, userId }: PostStatsProps) => {
    const location = useLocation();
    const { mutate: likePost } = useLikePost();
    const { mutate: savePost } = useSavePost();
    const { data: currentUser } = useGetCurrentUser();

    const likesList = post?.likes ? post.likes.map((like) => like.user.id) : [];
    const isLiked = post?.isLikedByMe ?? checkIsLiked(likesList, userId);
    const isSaved = post?.isSavedByMe ?? false;
    const [likes, setLikes] = useState<string[]>(likesList);

    const handleLikePost = (e: React.MouseEvent) => {
        e.stopPropagation(); //if click like then it'll just like and not doing anything further like opening the post from clicking on the post
        
        if(!post) return;

        let newLikes = [...likes];

        const hasLiked = newLikes.includes(userId);

        if(hasLiked) {
            newLikes = newLikes.filter((id) => id !== userId);
        } else {
            newLikes.push(userId);
        }

        setLikes(newLikes);
        likePost({ postId: post.id, shouldLike: !isLiked });
    }

    const handleSavePost = (e: React.MouseEvent) => {
        e.stopPropagation(); 

        if(!post) return;

        savePost({ postId: post.id, shouldSave: !isSaved});
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
            <img 
                src={isSaved ? "/assets/icons/saved2.svg" : "/assets/icons/save2.svg"}
                alt="save"
                width={20}
                height={20}
                onClick={handleSavePost}
                className="cursor-pointer"
            /> 
        </div>
    </div>
  )
}

export default PostStats