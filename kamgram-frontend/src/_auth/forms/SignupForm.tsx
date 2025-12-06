
import * as z from "zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import { useToast } from "@/hooks/use-toast";
import { useCreateUserAccount, useSignInAccount } from "@/lib/react-query/queries";
import { SignupValidation } from "@/lib/validation";
import { useUserContext } from "@/context/AuthContext";
// import { createUserAccount } from "@/lib/appwrite/api";




const SignupForm = () => {
  const { toast } = useToast()
  const navigate = useNavigate();
  const { checkAuthUser, isLoading: isUserLoading } = useUserContext();
  
  // 1. Define your form.
  const form = useForm<z.infer<typeof SignupValidation>>({
    resolver: zodResolver(SignupValidation),
    defaultValues: {
      name: "",
      username: "",
      email: "",
      password: "",
    },
  })

  //Queries
  const { mutateAsync: createUserAccount, isLoading: isCreatingAccount } = useCreateUserAccount();
  const { mutateAsync: signInAccount, isLoading: isSigningInUser } = useSignInAccount();
 
  // 2. Define a submit handler.
  const handleSignup = async (user: z.infer<typeof SignupValidation>) => {
    try {
    //Create the user
    const newUser = await createUserAccount(user);

    //After user is created
    if(!newUser) {
      toast({ title: 'Sign up failed. Please try again.'});
      return;
    };

    const session = await signInAccount({
      email: user.email,
      password: user.password,
    });

    if(!session) {
      toast({ title: 'Sign in failed. Please try again.'});
      navigate("/sign-in");
      return;
    }

    const isLoggedIn = await checkAuthUser();

    if(isLoggedIn) {
      form.reset();
      navigate('/'); //Go to homepage
    } else {
      toast({ title: 'Login failed. Please try again.'});
      return;
    }
  } catch (error) {
    console.log({ error });
  }
}

  return (
    <Form {...form}>
      <div className="sm:w-420 flex-center flex-col">
        <img src="/assets/images/logo.svg" alt="logo" />

        <h2 className="h3-bold md:h2-bold pt-5 sm:pt-12">
          Create a new account
        </h2>

        <p className="small-medium md:base-regular mt-2">
          To use Cowtown, please enter your details
        </p>

        <form onSubmit={form.handleSubmit(handleSignup)} className="flex flex-col gap-5 w-full mt-4">

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Username</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="text" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="bg-orange-200">
            {isCreatingAccount || isSigningInUser || isUserLoading ? (
              <div className="flex-center gap-2">
                <Loader /> Loading... 
              </div>
            ) : ("Sign up")}
          </Button>

          <p className="text-small-regular text-center mt-2">
            Already have an account?
            <Link 
            to="/sign-in" 
            className="text-small-semibold text-orange-400 ml-1">
              Log in
            </Link>
          </p>
        </form>
      </div>
    </Form>
  );
};

export default SignupForm