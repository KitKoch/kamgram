import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "../ui/textarea";
import FileUploader from "../shared/FileUploader";
import { Input } from "../ui/input";
import { PostValidation } from "@/lib/validation";
import { useCreatePost, useUpdatePost } from "@/lib/react-query/queries";
import { useUserContext } from '@/context/AuthContext';
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { IBackendPost } from "@/types";
import { uploadFileBackend } from "@/lib/backend/api";

type PostFormProps = {
  post?: IBackendPost;
  action: 'Create' | 'Update';
}

const PostForm = ({ post, action }: PostFormProps) => {
  const { mutateAsync: createPost, isLoading: isLoadingCreate } = useCreatePost();
  const { mutateAsync: updatePost, isLoading: isLoadingUpdate } = useUpdatePost();
  const { user } = useUserContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<z.infer<typeof PostValidation>>({
    resolver: zodResolver(PostValidation),
    defaultValues: {
      caption: post?.caption ?? "",
      file: [],
      location: post?.location ?? "",
      tags: post ? post.tags.join(',') : "", 
    },
  })
 
  async function onSubmit(values: z.infer<typeof PostValidation>) {
      try {
          if(post && action === "Update") {
            let imageUrl = post.imageUrl ?? "";

            if(values.file && values.file.length > 0) {
              imageUrl = await uploadFileBackend(values.file[0]);
            };

            const updatedPost = await updatePost({
              postId: post.id,
              payload: {
                caption: values.caption,
                location: values.location,
                tags: values.tags,
                imageUrl,
              },
            });

            if(!updatedPost) {
              toast({title: "Update failed. Please try again",});
              return;
            };

          return navigate(`/posts/${post.id}`);
        };

        //No need for else statement because if the action is not update then it will create a new post
        const newPost = await createPost({
          ...values,
          // userId: user.id, => Backend uses cookie, no need for userId
        } as any);

        if(!newPost) {
          toast({
            title: "Create post failed. Please try again",
          });
          return;
        }

        navigate('/');
    } catch (error) {
        console.error(error);
        toast({ title: "Something went wrong..."});
    };
  };

  return (
    <Form {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-9 w-full max-w-5xl">
      <FormField
        control={form.control}
        name="caption"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="shad-form_label2">Caption</FormLabel>
            <FormControl>
              <Textarea className="shad-textarea2 custom-scrollbar" {...field} />
            </FormControl>
            <FormMessage className="shad-form_message"/>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="file"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="shad-form_label2">Add Photos</FormLabel>
            <FormControl>
              <FileUploader 
                fieldChange={field.onChange}
                mediaUrl={post?.imageUrl ?? ''}
              />
            </FormControl>
            <FormMessage className="shad-form_message"/>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="shad-form_label2">Add Location</FormLabel>
            <FormControl>
              <Input type="text" className="shad-input2" {...field} />
            </FormControl>
            <FormMessage className="shad-form_message"/>
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="tags"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="shad-form_label2">Add Tags (separated by comma " , ")</FormLabel>
            <FormControl>
              <Input 
                type="text" 
                className="shad-input2" 
                placeholder="Boots, Hats, Horses"
                {...field}
              />
            </FormControl>
            <FormMessage className="shad-form_message"/>
          </FormItem>
        )}
      />
      <div className="flex gap-4 items-center justify-end">
      <Button 
        type="button" 
        className="shad-button_red"
        onClick={() => navigate(-1)}
      >
        Cancel
      </Button>
      <Button 
        type="submit"
        className="shad-button_primary2 whitespace-nowrap"
        disabled={isLoadingCreate || isLoadingUpdate}
      >
        {isLoadingCreate || isLoadingUpdate && 'Loading...'}
        {action} Post
      </Button>
      </div>
    </form>
  </Form>
  )
}

export default PostForm