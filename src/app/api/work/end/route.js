import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';
import WorkLog from '@/models/WorkLog';
import { startOfDay, endOfDay } from 'date-fns';
import { authOptions } from '../../auth/[...nextauth]/route';

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

    // Find today's work log
    const workLog = await WorkLog.findOne({
      userId: user._id,
      date: {
        $gte: startOfToday,
        $lte: endOfToday,
      },
    });

    if (!workLog) {
      return NextResponse.json(
        { error: 'No work session found for today' },
        { status: 400 }
      );
    }

    if (workLog.endTime) {
      return NextResponse.json(
        { error: 'Work already ended for today' },
        { status: 400 }
      );
    }

    // End the work session
    workLog.endTime = today;
    await workLog.save();

    return NextResponse.json({
      message: 'Work ended successfully',
      workLog,
    });
  } catch (error) {
    console.error('Error ending work:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 