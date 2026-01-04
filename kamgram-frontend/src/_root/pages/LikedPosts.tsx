import GridPostList from "@/components/shared/GridPostList";
import Loader from "@/components/shared/Loader";
import { useGetMyLikedPosts } from "@/lib/react-query/queries";

const LikedPosts = () => {
  const { data, isLoading, isError } = useGetMyLikedPosts();

  if(isLoading) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    )
  };

  if(isError) {
    return <p className="text-dark-1">Failed to load liked posts</p>;
  };

  const posts = data?.pages?.flatMap((p) => p.posts) ?? [];

  return (
    <>
      {posts.length === 0 && (
        <p className="text-dark-1">No liked posts</p>
      )}
      <GridPostList posts={posts} showStats={false} />
    </>
  )
}

export default LikedPosts