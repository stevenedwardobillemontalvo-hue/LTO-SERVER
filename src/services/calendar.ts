import { getCalendarClient } from "../utils/googleCalendar";
import { parseTimeRange } from "../utils/timeParser";

interface CalendarPayload {
  date: string;
  time: string;
  transactionType: string;
  refreshToken: string;
  clientInfo: {
    firstName: string;
    lastName: string;
    email: string;
    contactNumber: string;
  };
}

export async function createCalendarEvent({
  date,
  time,
  transactionType,
  refreshToken,
  clientInfo,
}: CalendarPayload) {
  const calendar = getCalendarClient(refreshToken);

  const { start, end } = parseTimeRange(date, time);

  await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: `📌 ${transactionType}`,
      description: `
Client: ${clientInfo.firstName} ${clientInfo.lastName}
Email: ${clientInfo.email}
Contact: ${clientInfo.contactNumber}
      `,
      start: {
        dateTime: start.toISOString(),
        timeZone: "Asia/Manila",
      },
      end: {
        dateTime: end.toISOString(),
        timeZone: "Asia/Manila",
      },
    },
  });
}
