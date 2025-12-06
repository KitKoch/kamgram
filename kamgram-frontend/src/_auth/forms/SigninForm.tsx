
import * as z from "zod";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/shared/Loader";
import { useToast } from "@/hooks/use-toast";
import { useSignInAccount } from "@/lib/react-query/queries";
import { SigninValidation } from "@/lib/validation";
import { useUserContext } from "@/context/AuthContext";

const SigninForm = () => {
  const { toast } = useToast()
  const navigate = useNavigate();
  const { checkAuthUser, isLoading: isUserLoading } = useUserContext();
  
  // 1. Define your form.
  const form = useForm<z.infer<typeof SigninValidation>>({
    resolver: zodResolver(SigninValidation),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  //Queries
  const { mutateAsync: signInAccount, isLoading: isSigningInUser } = useSignInAccount();
 
  // 2. Define a submit handler.
  const handleSignin = async (user: z.infer<typeof SigninValidation>) => {
    
    try {

    // const session = await signInAccount({
    //   email: user.email,
    //   password: user.password,
    // });

    const session = await signInAccount(user);

    if(!session) {
      toast({ title: 'Sign in failed. Please try again.'});
      navigate("/sign-in");
      return;
    }

    const isLoggedIn = await checkAuthUser();

    if(isLoggedIn) {
      form.reset();
      navigate('/');
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
          Log in to your account
        </h2>

        <p className="small-medium md:base-regular mt-2">
          Welcome Back! Please enter your details!
        </p>

        <form onSubmit={form.handleSubmit(handleSignin)} className="flex flex-col gap-5 w-full mt-4">

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
            {isSigningInUser || isUserLoading ? (
              <div className="flex-center gap-2">
                <Loader /> Loading... 
              </div>
            ) : ("Sign in")}
          </Button>

          <p className="text-small-regular text-center mt-2">
            Don't have an account?
            <Link 
            to="/sign-up" 
            className="text-small-semibold text-orange-400 ml-1">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </Form>
  );
};

export default SigninForm;