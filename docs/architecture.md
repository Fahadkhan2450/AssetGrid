# Architecture

Frontend communicates with the Express API and Socket.IO. Backend is the only component allowed to access MongoDB. MongoDB is the single source of truth. Excel is input/output only. Socket.IO emits live dashboard/notification events after successful database changes.
