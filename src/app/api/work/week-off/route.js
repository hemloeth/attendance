import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import dbConnect from '@/lib/mongodb';
import WorkLog from '@/models/WorkLog';
import User from '@/models/User';

export async function POST(request) {
  try {
    await dbConnect();
    
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user by email
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { startDate, endDate } = await request.json();
    
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (start > end) {
      return NextResponse.json({ error: 'Start date must be before end date' }, { status: 400 });
    }

    // Check if any existing logs exist for this period
    const existingLogs = await WorkLog.find({
      userId: user._id,
      date: {
        $gte: start,
        $lte: end
      }
    });

    if (existingLogs.length > 0) {
      return NextResponse.json({ 
        error: 'Work logs already exist for some dates in this period. Please select a different period.' 
      }, { status: 400 });
    }

    // Create week off logs for each day in the range
    const weekOffLogs = [];
    const currentDate = new Date(start);
    
    while (currentDate <= end) {
      // Skip weekends (Saturday = 6, Sunday = 0)
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        const workLog = new WorkLog({
          userId: user._id,
          date: new Date(currentDate),
          startTime: new Date(currentDate.setHours(9, 0, 0, 0)), // Set to 9 AM
          status: 'week_off'
        });
        
        weekOffLogs.push(workLog);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Save all week off logs
    const savedLogs = await WorkLog.insertMany(weekOffLogs);

    return NextResponse.json({ 
      message: `Week off marked successfully for ${savedLogs.length} working days`,
      logs: savedLogs 
    });

  } catch (error) {
    console.error('Error marking week off:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 