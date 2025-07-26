import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import dbConnect from '@/lib/mongodb';
import WorkLog from '@/models/WorkLog';
import User from '@/models/User';
import { startOfMonth, endOfMonth, parseISO, format } from 'date-fns';

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
    const monthParam = searchParams.get('month'); // Format: YYYY-MM
    
    let targetMonth = new Date();
    if (monthParam) {
      targetMonth = parseISO(monthParam + '-01');
    }

    const startOfTargetMonth = startOfMonth(targetMonth);
    const endOfTargetMonth = endOfMonth(targetMonth);

    // Get all users
    const users = await User.find({ role: 'user' });

    const reports = await Promise.all(
      users.map(async (user) => {
        const workLogs = await WorkLog.find({
          userId: user._id,
          date: {
            $gte: startOfTargetMonth,
            $lte: endOfTargetMonth,
          },
          status: 'completed',
        });

        const totalDays = workLogs.length;
        const totalMinutes = workLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
        const totalHours = totalMinutes / 60;
        const averageHoursPerDay = totalDays > 0 ? totalHours / totalDays : 0;

        return {
          userId: user._id,
          userName: user.name,
          userEmail: user.email,
          totalDays,
          totalHours: Math.round(totalHours * 100) / 100,
          averageHoursPerDay: Math.round(averageHoursPerDay * 100) / 100,
          workLogs: workLogs.map(log => ({
            date: format(log.date, 'yyyy-MM-dd'),
            startTime: log.startTime,
            endTime: log.endTime,
            duration: log.duration,
          })),
        };
      })
    );

    return NextResponse.json({
      month: format(targetMonth, 'yyyy-MM'),
      reports,
    });
  } catch (error) {
    console.error('Error fetching monthly reports:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 