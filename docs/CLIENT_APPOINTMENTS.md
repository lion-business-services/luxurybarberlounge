# Client Appointments

Authenticated clients access only their own appointments through RLS.

They can view the next visit, history, service, barber, time, estimate, deposit state, location, and notification state. Policy-permitted cancellation and atomic rescheduling are available. Calendar export is private and does not include internal notes.

Guest bookings are preserved before account creation. After OTP verification, an exact verified-email match links the client and appointment to the authenticated user. The system never merges records by name alone.
