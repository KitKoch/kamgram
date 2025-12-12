import { Link } from "react-router-dom";
import { multiFormatDateString } from "@/lib/utils";
import { useUserContext } from "@/context/AuthContext";
import PostStats from "./PostStats";
import { IBackendPost } from "@/types";

type PostCardProps = {
    post: IBackendPost;
}

const PostCard = ( { post }: PostCardProps) => {
    const { user } = useUserContext();

    // console.log(post);

    if(!post.creator) return;

  return (
    <div className="post-card2">
        <div className="flex-between">
            <div className="flex items-center gap-3">
                <Link to={`/profile/${post.creator.id}`}>
                    <img 
                        src={post.creator?.imageUrl || '/assets/icons/profile-placeholder.svg'}
                        alt='creator'
                        className="rounded-full w-12 lg:h-12"
                    />
                </Link>

                <div className="flex flex-col">
                    <p className="base-medium lg:body-bold text-yellow-300">
                      {post.creator.name}  
                    </p>
                    <div className="flex-center gap-2 text-yellow-100">
                        <p className="subtle-semibold lg:small-regular">
                            {multiFormatDateString(post.createdAt)}
                        </p>
                        -
                        <p className="subtle-semibold lg:small-regular">
                            {post.location}
                        </p>
                    </div>
                </div>
            </div>

            <Link 
                to={`/update-post/${post.id}`}
                className={`${user.id !== post.creator.id && "hidden"}`}
            >
                <img src="/assets/icons/edit2.svg" alt="edit" width={20} height={20} />
            </Link>
        </div>

        <Link to={`/post/${post.id}`}>
            <div className="small-medium lg:base-medium py-5">
                <p>{post.caption}</p>
                <ul className="flex gap-1 mt-2">
                    {post.tags.map((tag: string) => (
                        <li key={`${tag}`} className="text-yellow-100 small-regular">
                            #{tag}
                        </li>
                    ))}
                </ul>
            </div>

            <img 
                src={post.imageUrl || '/assets/icons/profile-placeholder.svg'}
                alt="post image"
                className="post-card_img2"
            />
        </Link>

        <PostStats post={post} userId={user.id}/>
    </div>
  )
}

export default PostCard