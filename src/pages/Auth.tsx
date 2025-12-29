import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Users, Lock, Mail, User, UserCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'client'>('client');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        
        if (error) {
          toast({
            title: "Error",
            description: error.message || "Failed to send reset email",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Reset Link Sent!",
            description: "Check your email for the password reset link.",
          });
          setResetEmailSent(true);
        }
      } else if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign In Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Welcome back!",
            description: "You have been signed in successfully.",
          });
          navigate('/');
        }
      } else {
        const { error } = await supabase
          .from('pending_users')
          .insert({
            email,
            password_hash: password,
            full_name: fullName,
            requested_role: accountType,
          });

        if (error) {
          toast({
            title: "Sign Up Error",
            description: error.message,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Registration Submitted!",
            description: "Your account request has been submitted for approval.",
          });
          setIsLogin(true);
          setIsForgotPassword(false);
          setEmail('');
          setPassword('');
          setFullName('');
          setAccountType('client');
        }
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 safe-area-top safe-area-bottom">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center pb-4 sm:pb-6">
          <div className="mx-auto w-14 h-14 sm:w-16 sm:h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          </div>
          <CardTitle className="text-xl sm:text-2xl font-bold">
            {isForgotPassword ? 'Reset Password' : (isLogin ? 'Sign In' : 'Request Account')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            {isForgotPassword 
              ? (resetEmailSent 
                ? 'Check your email for the reset link'
                : 'Enter your email to receive a password reset link')
              : (isLogin 
                ? 'Welcome back to your dashboard' 
                : 'Submit a request for account approval')
            }
          </p>
        </CardHeader>
        <CardContent className="pb-6">
          {isForgotPassword && resetEmailSent ? (
            <div className="text-center space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-green-800 dark:text-green-200 text-sm">
                  We've sent a password reset link to <strong>{email}</strong>. 
                  Please check your inbox.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Didn't receive the email? Check your spam folder or try again.
              </p>
              <Button 
                variant="outline" 
                onClick={() => setResetEmailSent(false)}
                className="w-full h-11 sm:h-10"
              >
                Send Another Link
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="fullName" className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required={!isLogin}
                    className="h-11 sm:h-10"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-11 sm:h-10"
                />
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center gap-2 text-sm">
                    <Lock className="h-4 w-4" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    className="h-11 sm:h-10"
                  />
                </div>
              )}

              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="accountType" className="flex items-center gap-2 text-sm">
                    <UserCheck className="h-4 w-4" />
                    Account Type
                  </Label>
                  <Select value={accountType} onValueChange={(value: 'user' | 'client') => setAccountType(value)}>
                    <SelectTrigger className="h-11 sm:h-10">
                      <SelectValue placeholder="Select account type" />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="client">Client Account</SelectItem>
                      <SelectItem value="user">User Account</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {accountType === 'client' 
                      ? 'View your marketing campaigns and analytics'
                      : 'Manage clients and create marketing campaigns'
                    }
                  </p>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full h-11 sm:h-10 text-sm font-medium" 
                disabled={loading}
              >
                {loading ? 'Please wait...' : (
                  isForgotPassword 
                    ? 'Send Reset Link'
                    : (isLogin ? 'Sign In' : 'Submit Request')
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center space-y-3">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setResetEmailSent(false);
                  setIsLogin(true);
                }}
                className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setIsForgotPassword(false);
                  }}
                  className="text-primary hover:text-primary/80 text-sm block w-full font-medium transition-colors"
                >
                  {isLogin 
                    ? "Don't have an account? Request access" 
                    : "Already have an account? Sign in"
                  }
                </button>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setIsLogin(false);
                    }}
                    className="text-muted-foreground hover:text-foreground text-sm block w-full transition-colors"
                  >
                    Forgot your password?
                  </button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
