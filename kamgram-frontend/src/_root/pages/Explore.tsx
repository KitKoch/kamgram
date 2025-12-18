import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import SearchResults from "@/components/shared/SearchResults";
import GridPostList from "@/components/shared/GridPostList";
import { useGetPosts, useSearchPosts } from "@/lib/react-query/queries";
import useDebounce from "@/hooks/useDebounce";
import Loader from "@/components/shared/Loader";
import { useInView } from "react-intersection-observer";

const Explore = () => {
  const { ref, inView } = useInView();
  const { data: posts, fetchNextPage, hasNextPage } = useGetPosts();
  const [searchValue, setSearchValue] = useState('');
  
  //Debouncing method: use a custom hook to delay the search until the user stops typing for a certain amount of time
  const debouncedValue = useDebounce(searchValue, 500);
  const { data: searchedPosts, isFetching: isSearchFetching } = useSearchPosts(debouncedValue);

  //console.log(posts); //Test checking if posts are being fetched

  useEffect(() => {
    if(inView && !searchValue) fetchNextPage();
  }, [inView, searchValue]);

  if(!posts) {
    return (
      <div className="flex-center w-full h-full">
        <Loader />
      </div>
    )
  };

  const shouldShowSearchResults = searchValue.trim().length > 0;
  const hasAnyPosts = posts.pages.some((page) => page.posts.length > 0);
  const shouldShowEndMessage = !shouldShowSearchResults && !hasNextPage && hasAnyPosts;
  const shouldShowEmptyMessage = !shouldShowSearchResults && !hasAnyPosts;

  return (
    <div className='explore-container'>
      <div className="explore-inner_container">
        <h2 className='h3-bold md:h2-bold w-full'>Search Posts</h2>
        <div className='flex gap-1 px-4 w-full rounded-lg bg-white'>
          <img 
            src="/assets/icons/search.svg"
            width={24}
            height={24}
            alt="search"
          />
          <Input
            type="text"
            placeholder="Search"
            className="explore-search2"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-between w-full max-w-5xl mt-16 mb-7">
        <h3 className='body-bold md:h3-bold'>Popular Today</h3>

        <div className="flex-center gap-3 bg-green-800 rounded-xl px-4 py-2 cursor-center">
          <p className="small-medium md:base-medium text-light-2">All</p>
          <img 
            src="/assets/icons/filter2.svg"
            width={20}
            height={20}
            alt="filter"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-9 w-full max-w-5xl">
        {shouldShowSearchResults ? (
          <SearchResults  
            isSearchFetching={isSearchFetching}
            searchedPosts={searchedPosts}
          />
        ) : shouldShowEmptyMessage ? (
          <p className="text-dark-4 mt-10 text-center w-full">No posts yet</p>
        ) : (
          <>
            {posts.pages.map((page, index) => (
              <GridPostList key={`page-${index}`} posts={page.posts} />
            ))}
            { shouldShowEndMessage && (
              <p className="text-dark-4 mt-10 text-center w-full">End of posts</p>
            )}
         </>
        )}
      </div>

      {hasNextPage && !searchValue && 
        <div ref={ref} className="mt-10">
          <Loader />
        </div>
      }
    </div>
  )
}

export default Explore