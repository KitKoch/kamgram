import { Models } from "appwrite";
import { useGetCurrentUser } from "@/lib/react-query/queries";
import Loader from "@/components/shared/Loader";
import GridPostList from "@/components/shared/GridPostList";

const Saved = () => {
  const {data: currentUser } = useGetCurrentUser();

  const savedPosts = currentUser?.save.map((savePost: Models.Document) => ({
    ...savePost.post,
    creator: {
      imageUrl: currentUser.imageUrl,
    }
  }))
  return (
    <div className='saved-container'>
      <div className='flex gap-2 w-full max-w-5xl'>
        <img 
          src="/assets/icons/saved3.svg"
          width={36}
          height={36}
          alt="edit"
        />
        <h2 className="h3-bold md:h2-bold text-left w-full">Saved Posts</h2>
      </div>

      {!currentUser ? (
        <Loader />
      ) : (
        <ul className="w-full flex justify-center max-w-5xl gap-9">
          {savedPosts.length === 0 ? (
            <p className="text-dark-1">No available posts</p>
          ) : (
            <GridPostList posts={savedPosts} showStats={false} />
          )}
        </ul>
      )}
    </div>
  )
}

export default Saved