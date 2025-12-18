import Loader from "./Loader";
import GridPostList from "./GridPostList";

type SearchResultsProps = {
  isSearchFetching: boolean,
  searchedPosts: any,
};

const SearchResults = ({ isSearchFetching, searchedPosts } : SearchResultsProps) => {
  if(isSearchFetching) return <Loader />;
  
  if(searchedPosts && searchedPosts.length > 0) return (
    <GridPostList posts={searchedPosts} />
  )
  return (
    <p className="text-dark-1 mt-10 text-center w-full">No results found</p>
  )
}

export default SearchResults;