
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
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'user' | 'client'>('client');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isForgotPassword && !isOtpSent) {
        // Send OTP for password reset
        const { data, error } = await supabase.functions.invoke('send-password-reset-otp', {
          body: { email }
        });
        
        if (error) {
          toast({
            title: "Error",
            description: error.message || "Failed to send OTP",
            variant: "destructive",
          });
        } else {
          toast({
            title: "OTP Sent!",
            description: "Check your email for the verification code.",
          });
          setIsOtpSent(true);
        }
      } else if (isForgotPassword && isOtpSent) {
        // Verify OTP and reset password
        const { data, error } = await supabase.functions.invoke('verify-otp-and-reset-password', {
          body: { 
            email, 
            otp, 
            newPassword 
          }
        });
        
        if (error) {
          toast({
            title: "Error",
            description: error.message || "Invalid OTP or failed to reset password",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Password Reset Successfully!",
            description: "You can now sign in with your new password.",
          });
          setIsForgotPassword(false);
          setIsOtpSent(false);
          setIsLogin(true);
          setEmail('');
          setOtp('');
          setNewPassword('');
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
        // For signup, create a pending user request
        const { error } = await supabase
          .from('pending_users')
          .insert({
            email,
            password_hash: password, // In production, this should be hashed
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
            description: "Your account request has been submitted for approval. You'll be notified once it's reviewed.",
          });
          setIsLogin(true);
          setIsForgotPassword(false);
          // Clear form
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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isForgotPassword ? (isOtpSent ? 'Enter OTP' : 'Reset Password') : (isLogin ? 'Sign In' : 'Request Account')}
          </CardTitle>
          <p className="text-gray-600">
            {isForgotPassword 
              ? (isOtpSent 
                ? 'Enter the verification code sent to your email and your new password'
                : 'Enter your email to receive a verification code')
              : (isLogin 
                ? 'Welcome back to your client dashboard' 
                : 'Submit a request for account approval')
            }
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="fullName" className="flex items-center gap-2">
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
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
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
              />
            </div>

            {isForgotPassword && isOtpSent && (
              <div className="space-y-2">
                <Label htmlFor="otp" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Verification Code
                </Label>
                <Input
                  id="otp"
                  type="text"
                  placeholder="Enter 6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                />
              </div>
            )}

            {isForgotPassword && isOtpSent && (
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter your new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            )}

            {!isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
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
                />
              </div>
            )}

            {!isLogin && !isForgotPassword && (
              <div className="space-y-2">
                <Label htmlFor="accountType" className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Account Type
                </Label>
                <Select value={accountType} onValueChange={(value: 'user' | 'client') => setAccountType(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="client">Client Account</SelectItem>
                    <SelectItem value="user">User Account</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">
                  {accountType === 'client' 
                    ? 'Request access to view your marketing campaigns and analytics'
                    : 'Request access to manage clients and create marketing campaigns'
                  }
                </p>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading ? 'Please wait...' : (
                isForgotPassword 
                  ? (isOtpSent ? 'Reset Password' : 'Send Verification Code')
                  : (isLogin ? 'Sign In' : 'Submit Request')
              )}
            </Button>
          </form>

          <div className="mt-6 text-center space-y-2">
            {isForgotPassword ? (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setIsOtpSent(false);
                    setIsLogin(true);
                    setOtp('');
                    setNewPassword('');
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm"
                >
                  Back to Sign In
                </button>
                {isOtpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtp('');
                      setNewPassword('');
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm block"
                  >
                    Resend Code
                  </button>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setIsForgotPassword(false);
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm block"
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
                    className="text-blue-600 hover:text-blue-700 text-sm block"
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
