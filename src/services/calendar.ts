import { getCalendarClient } from "../utils/googleCalendar";
import { parseTimeRange } from "../utils/timeParser";

interface CalendarPayload {
  start: string;
  end: string;
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
  start,
  end,
  transactionType,
  refreshToken,
  clientInfo,
}: CalendarPayload) {
  const calendar = getCalendarClient(refreshToken);

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
        dateTime: start,
        timeZone: "Asia/Manila",
      },
      end: {
        dateTime: end,
        timeZone: "Asia/Manila",
      },
    },
  });
}
