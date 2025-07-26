import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import WorkLog from '@/models/WorkLog';
import User from '@/models/User';
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export async function GET(request) {
  try {
    const session = await getServerSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    // Get user from database using email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user is admin
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    let targetDate = new Date();
    if (dateParam) {
      targetDate = parseISO(dateParam);
    }

    const startOfTargetDay = startOfDay(targetDate);
    const endOfTargetDay = endOfDay(targetDate);

    const dailyLogs = await WorkLog.find({
      date: {
        $gte: startOfTargetDay,
        $lte: endOfTargetDay,
      },
    }).populate('userId', 'name email');

    return NextResponse.json({
      date: targetDate.toISOString().split('T')[0],
      logs: dailyLogs,
    });
  } catch (error) {
    console.error('Error fetching daily logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 