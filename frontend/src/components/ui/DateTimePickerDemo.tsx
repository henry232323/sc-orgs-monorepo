import React, { useState } from 'react';
import { Paper } from './index';
import { DateTimePicker, DatePicker, TimePicker } from './index';

const DateTimePickerDemo: React.FC = () => {
  const [dateTimeValue, setDateTimeValue] = useState('');
  const [dateValue, setDateValue] = useState('');
  const [timeValue, setTimeValue] = useState('');

  return (
    <div className='space-y-8 p-6'>
      <div className='text-center'>
        <h1 className='text-3xl font-bold text-white mb-4'>
          Custom Date/Time Pickers
        </h1>
        <p className='text-white/60 text-lg'>
          Beautiful, glassy date and time selection components
        </p>
      </div>

      <Paper variant='glass' size='lg'>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-white mb-4'>
            DateTimePicker (Combined)
          </h2>
          <p className='text-white/60 text-sm mb-4'>
            Select both date and time in one component. Perfect for event
            scheduling.
          </p>
        </div>

        <DateTimePicker
          label='Event Date & Time'
          value={dateTimeValue}
          onChange={setDateTimeValue}
          placeholder='Select event date and time'
        />

        {dateTimeValue && (
          <div className='mt-4 p-3 bg-white/10 rounded-lg'>
            <p className='text-white/80 text-sm'>Selected: {dateTimeValue}</p>
          </div>
        )}
      </Paper>

      <Paper variant='glass' size='lg'>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-white mb-4'>
            DatePicker (Date Only)
          </h2>
          <p className='text-white/60 text-sm mb-4'>
            Select just a date. Great for birthdays, deadlines, or date-specific
            events.
          </p>
        </div>

        <DatePicker
          label='Event Date'
          value={dateValue}
          onChange={setDateValue}
          placeholder='Select event date'
        />

        {dateValue && (
          <div className='mt-4 p-3 bg-white/10 rounded-lg'>
            <p className='text-white/80 text-sm'>Selected: {dateValue}</p>
          </div>
        )}
      </Paper>

      <Paper variant='glass' size='lg'>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-white mb-4'>
            TimePicker (Time Only)
          </h2>
          <p className='text-white/60 text-sm mb-4'>
            Select just a time. Useful for daily schedules or time-specific
            reminders.
          </p>
        </div>

        <TimePicker
          label='Event Time'
          value={timeValue}
          onChange={setTimeValue}
          placeholder='Select event time'
          interval={30}
        />

        {timeValue && (
          <div className='mt-4 p-3 bg-white/10 rounded-lg'>
            <p className='text-white/80 text-sm'>Selected: {timeValue}</p>
          </div>
        )}
      </Paper>

      <Paper variant='glass' size='lg'>
        <div className='mb-6'>
          <h2 className='text-xl font-semibold text-white mb-4'>Features</h2>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <h3 className='text-lg font-semibold text-white mb-3'>
              ✨ Visual Design
            </h3>
            <ul className='space-y-2 text-white/70 text-sm'>
              <li>• Glassy backdrop blur effects</li>
              <li>• Smooth hover animations</li>
              <li>• Consistent with app theme</li>
              <li>• Beautiful shadows and borders</li>
            </ul>
          </div>

          <div>
            <h3 className='text-lg font-semibold text-white mb-3'>
              🚀 Functionality
            </h3>
            <ul className='space-y-2 text-white/70 text-sm'>
              <li>• Month navigation</li>
              <li>• Today highlighting</li>
              <li>• 15-minute time intervals</li>
              <li>• Click outside to close</li>
            </ul>
          </div>
        </div>
      </Paper>
    </div>
  );
};

export default DateTimePickerDemo;
