import {
    useQuery, //fetching data
    useMutation, //mutating data
    useQueryClient,
    useInfiniteQuery,
} from '@tanstack/react-query';
import { 
    createUserAccountBackend, 
    getCurrentUserBackend, 
    signInBackend, 
    signOutBackend, 
    createPostBackend, 
    getRecentPostBackend, 
    getPostByIdBackEnd,
    updatePostBackend,
    deletePostBackend,
    savePostBackend,
    unsavePostBackend,
    likePostBackend,
    unlikePostBackend,
    getInfinitePostsBackend,
    searchPostsBackend,
    updateMeBackend, 
    getUsersBackend,
    getUserByIdBackend,
    getPostLikesBackend,
} from '../backend/api'; 
import { INewUser, INewPost, IUpdatePostBackend, IUpdateMe } from '@/types';
import { QUERY_KEYS } from './queryKeys';
import { useUserContext } from '@/context/AuthContext';

// ========================================================================================================================================================
// AUTH QUERIES 
// ========================================================================================================================================================
export const useCreateUserAccount = () => {
    return useMutation({
        mutationFn: (user: INewUser) => createUserAccountBackend(user),
    });
};

export const useSignInAccount = () => {
    return useMutation({
        mutationFn: (user: { email: string; password: string; }) => 
        signInBackend({
            emailOrUsername: user.email,
            password: user.password,
        }),
    });
};

export const useSignOutAccount = () => {
    return useMutation({
        mutationFn: signOutBackend
    });
};

// ========================================================================================================================================================
// POST QUERIES 
// ========================================================================================================================================================
export const useCreatePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (post: INewPost) => createPostBackend(post),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_RECENT_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_INFINITE_POSTS] });    
        },
    });
};

export const useGetRecentPosts = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
        queryFn: getRecentPostBackend,
    });
};

export const useLikePost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ postId, shouldLike} : { postId: string; shouldLike: boolean }) => {
            if(shouldLike) {
                await likePostBackend(postId);
            } else {
                await unlikePostBackend(postId);
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_POST_BY_ID] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_RECENT_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_INFINITE_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_CURRENT_USER] });
        },
    });
};

export const useGetPostLike = (postId: string) => {
    return useInfiniteQuery(
        [QUERY_KEYS.GET_POST_LIKES, postId],
        ({ pageParam = null }) => 
            getPostLikesBackend(postId, pageParam ?? undefined, 20),
        {
            enabled: !!postId,
            getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
        },
    );
};

export const useSavePost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ postId, shouldSave } : { postId: string; shouldSave: boolean}) => {
            if(shouldSave) {
                await savePostBackend(postId);
            } else {
                await unsavePostBackend(postId);
            };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_RECENT_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_INFINITE_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_CURRENT_USER] });
        },
    });
};

export const useGetPostById = (postId: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_POST_BY_ID, postId],
        queryFn: () => getPostByIdBackEnd(postId),
        enabled: !!postId,
    });
};

export const useUpdatePost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ postId, payload } : { postId: string, payload: IUpdatePostBackend}) => updatePostBackend(postId, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_POST_BY_ID, data?.id] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_RECENT_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_INFINITE_POSTS] });
        },
    });
};

export const useDeletePost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (postId: string) => deletePostBackend(postId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_RECENT_POSTS] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_INFINITE_POSTS] });
        },
    });
};

//useInfiniteQuery is react built in hook for infinite scroll, it will fetch the next page of data when the user scrolls to the bottom of the page
export const useGetPosts = () => {
  return useInfiniteQuery(
    [QUERY_KEYS.GET_INFINITE_POSTS],
    ({ pageParam = null }) => 
        getInfinitePostsBackend(pageParam ?? undefined, 10), 
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    }
  );
};

export const useSearchPosts = (searchTerm: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SEARCH_POSTS, searchTerm],
        queryFn: () => searchPostsBackend(searchTerm),
        enabled: !!searchTerm //When is it going to be automatically refetched? When the search term changes
    });
};

// ========================================================================================================================================================
// USER QUERIES 
// ========================================================================================================================================================
export const useGetUsers = (limit?: number) => {
    const { isAuthenticated } = useUserContext();

    return useQuery({
        queryKey: [QUERY_KEYS.GET_USERS],
        queryFn: () => getUsersBackend(limit ?? 20),
        enabled: isAuthenticated,
    });
};

export const useGetCurrentUser = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
        queryFn: getCurrentUserBackend,
    });
};

export const useGetUserById = (userId: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_USER_BY_ID, userId],
        queryFn: () => getUserByIdBackend(userId),
        enabled: !!userId, //When is it going to be automatically refetched? When the userId changes
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (payload: IUpdateMe) => updateMeBackend(payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_CURRENT_USER], });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.GET_USERS], });
        },
    });
};

