import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import WorkLog from '@/models/WorkLog';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST() {
  try {
    const session = await getServerSession();
    
    console.log('Session received:', {
      hasSession: !!session,
      userEmail: session?.user?.email,
      userId: session?.user?.id,
      userRole: session?.user?.role
    });
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!session.user.email) {
      return NextResponse.json({ error: 'User email not found in session' }, { status: 400 });
    }

    await dbConnect();

    // Get user from database using email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    console.log('Found user:', user._id);

    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Check if user already has a work log for today
    const existingLog = await WorkLog.findOne({
      userId: user._id,
      date: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    if (existingLog) {
      return NextResponse.json(
        { error: 'Work already started for today' },
        { status: 400 }
      );
    }

    // Create new work log
    const workLog = await WorkLog.create({
      userId: user._id,
      date: today,
      startTime: today,
    });

    return NextResponse.json({
      message: 'Work started successfully',
      workLog,
    });
  } catch (error) {
    console.error('Error starting work:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 