import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account.provider === 'google') {
        await dbConnect();
        
        const existingUser = await User.findOne({ email: user.email });
        
        if (!existingUser) {
          // Create new user
          const newUser = await User.create({
            email: user.email,
            name: user.name,
            image: user.image,
            googleId: profile.sub,
          });
          console.log('Created new user:', newUser._id);
        } else {
          console.log('Existing user found:', existingUser._id);
        }
      }
      return true;
    },
    async session({ session, token }) {
      try {
        console.log('Session callback - Token data:', {
          hasUserId: !!token.userId,
          hasRole: !!token.role,
          email: token.email
        });
        
        if (token.userId && token.role) {
          session.user.id = token.userId;
          session.user.role = token.role;
          console.log('Session updated from token - User ID:', token.userId, 'Role:', token.role);
        } else {
          // Fallback: query database directly
          await dbConnect();
          const user = await User.findOne({ email: session.user.email });
          if (user) {
            session.user.id = user._id.toString();
            session.user.role = user.role;
            console.log('Session updated from database - User ID:', user._id, 'Role:', user.role);
          } else {
            console.error('User not found in database:', session.user.email);
            // Set default role to prevent client-side errors
            session.user.role = 'user';
          }
        }
        
        // Ensure we always have a role
        if (!session.user.role) {
          session.user.role = 'user';
        }
        
        console.log('Final session data:', {
          hasUserId: !!session.user.id,
          hasRole: !!session.user.role,
          email: session.user.email
        });
        
        return session;
      } catch (error) {
        console.error('Error in session callback:', error);
        // Return session with default values to prevent client-side errors
        session.user.role = session.user.role || 'user';
        return session;
      }
    },
    async jwt({ token, user, account }) {
      try {
        // Initial sign in
        if (account && user) {
          await dbConnect();
          const dbUser = await User.findOne({ email: user.email });
          if (dbUser) {
            token.userId = dbUser._id.toString();
            token.role = dbUser.role;
            console.log('JWT updated with user ID:', dbUser._id);
          }
        }
        
        // Subsequent calls - ensure we always have user data
        if (token.email && (!token.userId || !token.role)) {
          await dbConnect();
          const dbUser = await User.findOne({ email: token.email });
          if (dbUser) {
            token.userId = dbUser._id.toString();
            token.role = dbUser.role;
            console.log('JWT updated on subsequent call - User ID:', dbUser._id);
          }
        }
        
        return token;
      } catch (error) {
        console.error('Error in JWT callback:', error);
        return token;
      }
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 