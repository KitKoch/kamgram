import {
    useQuery, //fetching data
    useMutation, //mutating data
    useQueryClient,
    useInfiniteQuery,
} from '@tanstack/react-query';
import { 
    // createUserAccount, 
    // signInAccount,
    // signOutAccount,
    // createPost,
    // getRecentPosts,
    getUsers,
    likePost,
    savePost,
    deleteSavedPost,
    // getCurrentUser,
    // getPostById,
    updatePost,
    deletePost,
    getInfinitePosts,
    searchPosts,
    getUserById,
    updateUser,
 } from '../appwrite/api';
import { createUserAccountBackend, 
         getCurrentUserBackend, 
         signInBackend, 
         signOutBackend, 
         createPostBackend, 
         getRecentPostBackend, 
         getPostByIdBackEnd, 
} from '../backend/api'; 
import { INewUser, INewPost, IUpdatePost, IUpdateUser } from '@/types';
import { QUERY_KEYS } from './queryKeys';

//AUTH QUERIES ======================================================================================================================
// export const useCreateUserAccount = () => {
//     return useMutation({
//         mutationFn: (user: INewUser) => createUserAccount(user),
//     });
// };
export const useCreateUserAccount = () => {
    return useMutation({
        mutationFn: (user: INewUser) => createUserAccountBackend(user),
    });
};

// export const useSignInAccount = () => {
//     return useMutation({
//         mutationFn: (user: {
//             email: string; 
//             password: string;
//         }) => signInAccount(user),
//     });
// };
export const useSignInAccount = () => {
    return useMutation({
        mutationFn: (user: { email: string; password: string; }) => 
        signInBackend({
            emailOrUsername: user.email,
            password: user.password,
        }),
    });
};

// export const useSignOutAccount = () => {
//     return useMutation({
//         mutationFn: signOutAccount //self calling function
//     });
// };
export const useSignOutAccount = () => {
    return useMutation({
        mutationFn: signOutBackend
    });
};

//POST QUERIES ======================================================================================================================

// export const useCreatePost = () => {
//     const queryClient = useQueryClient();
//     return useMutation({
//         mutationFn: (post: INewPost) => createPost(post),
//         onSuccess: () => { //Why invalidate queries? Because it allows to fetch new fresh data, meaning it wont be able to get recent post from cache, rather it will get it from the server
//             queryClient.invalidateQueries({
//                 queryKey: [QUERY_KEYS.GET_RECENT_POSTS], //do this to minimize bug and typo if manually write the query key
//             });
//         },
//     });
// };
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


// export const useGetRecentPosts = () => {
//     return useQuery({
//         queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
//         queryFn: getRecentPosts,
//     })
// };
export const useGetRecentPosts = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
        queryFn: getRecentPostBackend,
    });
};

export const useLikePost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ postId, likesArray}: {postId: string; likesArray: string[]}) => likePost(postId, likesArray),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_POST_BY_ID, data?.$id]
            })
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_RECENT_POSTS]
            })
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_POSTS]
            })
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_CURRENT_USER]
            })
        }
    })
};

export const useSavePost = () => {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: ({ userId, postId }: { userId: string; postId: string }) =>
        savePost(userId, postId),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.GET_POSTS],
        });
        queryClient.invalidateQueries({
          queryKey: [QUERY_KEYS.GET_CURRENT_USER],
        });
      },
    });
};

export const useDeleteSavedPost = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (savedRecordId: string) => deleteSavedPost(savedRecordId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
            });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_POSTS],
            });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_CURRENT_USER],
            });
        },
    });
};

// export const useGetPostById = (postId: string) => {
//     return useQuery({
//         queryKey: [QUERY_KEYS.GET_POST_BY_ID, postId],
//         queryFn: () => getPostById(postId),
//         enabled: !!postId, //set this to false to disable automatic refetching when the query mounts or query keys change, so we want to enable fetching only when we're fetching for another id, if we're fetching for the same one then we'll get the same detail if the postId didnt change 
//     })
// };
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
        mutationFn: (post: IUpdatePost) => updatePost(post),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_POST_BY_ID, data?.$id]
            })
        }
    })
};

export const useDeletePost = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ postId, imageId } : { postId: string, imageId: string}) => deletePost(postId, imageId),
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_RECENT_POSTS],
            })
        }
    })
};

export const useGetPosts = () => {
    return useInfiniteQuery({ //useInfiniteQuery is react built in hook for infinite scroll, it will fetch the next page of data when the user scrolls to the bottom of the page
        queryKey: [QUERY_KEYS.GET_INFINITE_POSTS],
        queryFn: getInfinitePosts as any, 
        getNextPageParam: (lastPage: any) => {
            //If theres no data, there are no more pages
            if(lastPage && lastPage.documents.length === 0) return null;

            //Use $id of the last document as the cursor
            const lastId = lastPage.documents[lastPage.documents.length - 1].$id;

            return lastId;
        }
    })
};

export const useSearchPosts = (searchTerm: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.SEARCH_POSTS, searchTerm],
        queryFn: () => searchPosts(searchTerm),
        enabled: !!searchTerm //When is it going to be automatically refetched? When the search term changes
    })
}

//USER QUERIES ======================================================================================================================
export const useGetUsers = (limit?: number) => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_USERS],
        queryFn: () => getUsers(limit),
    });
};

// export const useGetCurrentUser = () => {
//     return useQuery({
//         queryKey: [QUERY_KEYS.GET_CURRENT_USER],
//         queryFn: getCurrentUser,
//     });
// };
export const useGetCurrentUser = () => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_CURRENT_USER],
        queryFn: getCurrentUserBackend,
    })
};

export const useGetUserById = (userId: string) => {
    return useQuery({
        queryKey: [QUERY_KEYS.GET_USER_BY_ID, userId],
        queryFn: () => getUserById(userId),
        enabled: !!userId, //When is it going to be automatically refetched? When the userId changes
    });
};

export const useUpdateUser = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (user: IUpdateUser) => updateUser(user),
        onSuccess: (data) => {
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_CURRENT_USER],
            });
            queryClient.invalidateQueries({
                queryKey: [QUERY_KEYS.GET_USER_BY_ID, data?.$id],
            })
        }
    })
}

