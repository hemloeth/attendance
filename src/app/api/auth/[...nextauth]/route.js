import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

const authOptions = {

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
      if (token.userId) {
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
        }
      }
      
      return session;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        await dbConnect();
        const dbUser = await User.findOne({ email: user.email });
        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.role = dbUser.role;
          console.log('JWT updated with user ID:', dbUser._id);
        }
      }
      
      // Also update on subsequent calls if we have the email
      if (token.email && !token.userId) {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.userId = dbUser._id.toString();
          token.role = dbUser.role;
          console.log('JWT updated on subsequent call - User ID:', dbUser._id);
        }
      }
      
      return token;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 