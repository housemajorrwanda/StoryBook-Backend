# Testimony API Documentation

## Overview
Complete CRUD API for managing testimonies with support for written, audio, and video submissions. Includes dynamic validation based on submission type and identity preferences.

---

## Features

✅ **Multiple Submission Types**: Written, Audio, Video  
✅ **Identity Options**: Public or Anonymous  
✅ **Dynamic Validation**: Required fields change based on submission type  
✅ **Image Support**: Multiple images with descriptions for all types  
✅ **User Authentication**: JWT-based authentication  
✅ **Authorization**: Users can only edit/delete their own testimonies  
✅ **Status Management**: Pending, Approved, Rejected  
✅ **Publishing Control**: Toggle publish/unpublish  
✅ **Comprehensive Error Handling**: Proper HTTP status codes and messages  

---

## Database Schema

### Testimony Table
```sql
- id: Integer (Primary Key)
- submissionType: String (written, audio, video)
- identityPreference: String (public, anonymous)
- fullName: String (optional, required if public)
- relationToEvent: String (optional)
- nameOfRelative: String (optional)
- location: String (optional)
- dateOfEvent: DateTime (optional)
- eventTitle: String (required)
- eventDescription: String (optional)
- fullTestimony: Text (required for written type)
- audioUrl: String (required for audio type)
- audioFileName: String (required for audio type)
- audioDuration: Integer (optional)
- videoUrl: String (required for video type)
- videoFileName: String (required for video type)
- videoDuration: Integer (optional)
- agreedToTerms: Boolean (required)
- status: String (default: pending)
- isPublished: Boolean (default: false)
- userId: Integer (Foreign Key)
- createdAt: DateTime
- updatedAt: DateTime
```

### Testimony Images Table
```sql
- id: Integer (Primary Key)
- imageUrl: String (required)
- imageFileName: String (required)
- description: String (optional)
- order: Integer (default: 0)
- testimonyId: Integer (Foreign Key)
- createdAt: DateTime
- updatedAt: DateTime
```

---

## API Endpoints

### 1. Create Testimony
**POST** `/testimonies`

**Authentication**: Required (JWT)

**Request Body Examples**:

#### Written Testimony
```json
{
  "submissionType": "written",
  "identityPreference": "public",
  "fullName": "John Doe",
  "relationToEvent": "Survivor",
  "nameOfRelative": "Jane Doe",
  "location": "Kigali, Rwanda",
  "dateOfEvent": "1994-04-07",
  "eventTitle": "My Story of Survival",
  "eventDescription": "A brief overview of what happened",
  "fullTestimony": "This is my full written testimony. It must be at least 50 characters long...",
  "images": [
    {
      "imageUrl": "https://example.com/image1.jpg",
      "imageFileName": "memorial-photo.jpg",
      "description": "Photo from the memorial",
      "order": 0
    }
  ],
  "agreedToTerms": true
}
```

#### Audio Testimony
```json
{
  "submissionType": "audio",
  "identityPreference": "anonymous",
  "relationToEvent": "Witness",
  "location": "Butare, Rwanda",
  "dateOfEvent": "1994-04-15",
  "eventTitle": "What I Witnessed",
  "eventDescription": "Brief description",
  "audioUrl": "https://example.com/audio/testimony.mp3",
  "audioFileName": "testimony-audio.mp3",
  "audioDuration": 180,
  "images": [
    {
      "imageUrl": "https://example.com/image1.jpg",
      "imageFileName": "location-photo.jpg",
      "description": "Location where events occurred"
    }
  ],
  "agreedToTerms": true
}
```

#### Video Testimony
```json
{
  "submissionType": "video",
  "identityPreference": "public",
  "fullName": "Jane Smith",
  "relationToEvent": "Family Member",
  "nameOfRelative": "John Smith",
  "location": "Gisenyi, Rwanda",
  "dateOfEvent": "1994-05-01",
  "eventTitle": "In Memory of My Brother",
  "eventDescription": "Remembering my brother",
  "videoUrl": "https://example.com/video/testimony.mp4",
  "videoFileName": "testimony-video.mp4",
  "videoDuration": 300,
  "agreedToTerms": true
}
```

**Responses**:
- `201 Created`: Testimony created successfully
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated

---

### 2. Get All Testimonies
**GET** `/testimonies`

**Authentication**: Not required

**Query Parameters**:
- `submissionType` (optional): Filter by type (written, audio, video)
- `status` (optional): Filter by status (pending, approved, rejected)
- `userId` (optional): Filter by user ID
- `isPublished` (optional): Filter by published status (true, false)

**Examples**:
```bash
GET /testimonies
GET /testimonies?submissionType=written
GET /testimonies?status=approved&isPublished=true
GET /testimonies?userId=1
```

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "submissionType": "written",
    "identityPreference": "public",
    "fullName": "John Doe",
    "relationToEvent": "Survivor",
    "eventTitle": "My Story",
    "eventDescription": "Brief description",
    "fullTestimony": "Full testimony text...",
    "images": [...],
    "status": "approved",
    "isPublished": true,
    "userId": 1,
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z",
    "user": {
      "id": 1,
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe"
    }
  }
]
```

---

### 3. Get My Testimonies
**GET** `/testimonies/my-testimonies`

**Authentication**: Required (JWT)

**Response**: `200 OK` - Returns all testimonies created by the authenticated user

---

### 4. Get Single Testimony
**GET** `/testimonies/:id`

**Authentication**: Not required

**Response**: 
- `200 OK`: Testimony details
- `404 Not Found`: Testimony not found

---

### 5. Update Testimony
**PATCH** `/testimonies/:id`

**Authentication**: Required (JWT)

**Authorization**: Can only update own testimonies

**Request Body**: Same as create, but all fields are optional except validation rules

**Note**: Cannot change `submissionType` or `agreedToTerms` after creation

**Responses**:
- `200 OK`: Testimony updated successfully
- `400 Bad Request`: Validation failed
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized to update this testimony
- `404 Not Found`: Testimony not found

---

### 6. Delete Testimony
**DELETE** `/testimonies/:id`

**Authentication**: Required (JWT)

**Authorization**: Can only delete own testimonies

**Responses**:
- `200 OK`: Testimony deleted successfully
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized to delete this testimony
- `404 Not Found`: Testimony not found

---

### 7. Update Status (Admin)
**PATCH** `/testimonies/:id/status`

**Authentication**: Required (JWT)

**Request Body**:
```json
{
  "status": "approved"
}
```

Valid statuses: `pending`, `approved`, `rejected`

**Responses**:
- `200 OK`: Status updated successfully
- `400 Bad Request`: Invalid status
- `401 Unauthorized`: Not authenticated
- `404 Not Found`: Testimony not found

---

### 8. Toggle Publish Status
**PATCH** `/testimonies/:id/toggle-publish`

**Authentication**: Required (JWT)

**Authorization**: Can only toggle own testimonies

**Responses**:
- `200 OK`: Publish status toggled successfully
- `401 Unauthorized`: Not authenticated
- `403 Forbidden`: Not authorized
- `404 Not Found`: Testimony not found

---

## Validation Rules

### Submission Type: WRITTEN
**Required Fields**:
- `submissionType`: "written"
- `identityPreference`: "public" or "anonymous"
- `eventTitle`: 5-300 characters
- `fullTestimony`: 50-50000 characters
- `agreedToTerms`: true

**Optional Fields**:
- `fullName`: Required if identityPreference is "public"
- `relationToEvent`, `nameOfRelative`, `location`, `dateOfEvent`
- `eventDescription`: Max 1000 characters
- `images`: Array of image objects

### Submission Type: AUDIO
**Required Fields**:
- `submissionType`: "audio"
- `identityPreference`: "public" or "anonymous"
- `eventTitle`: 5-300 characters
- `audioUrl`: Max 500 characters
- `audioFileName`: Max 255 characters
- `agreedToTerms`: true

**Optional Fields**:
- `fullName`: Required if identityPreference is "public"
- `relationToEvent`, `nameOfRelative`, `location`, `dateOfEvent`
- `eventDescription`: Max 1000 characters
- `audioDuration`: Integer (seconds)
- `images`: Array of image objects

### Submission Type: VIDEO
**Required Fields**:
- `submissionType`: "video"
- `identityPreference`: "public" or "anonymous"
- `eventTitle`: 5-300 characters
- `videoUrl`: Max 500 characters
- `videoFileName`: Max 255 characters
- `agreedToTerms`: true

**Optional Fields**:
- `fullName`: Required if identityPreference is "public"
- `relationToEvent`, `nameOfRelative`, `location`, `dateOfEvent`
- `eventDescription`: Max 1000 characters
- `videoDuration`: Integer (seconds)
- `images`: Array of image objects

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": [
    "Full testimony is required for written submissions",
    "Event title must be at least 5 characters"
  ],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "You can only update your own testimonies",
  "error": "Forbidden"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Testimony not found",
  "error": "Not Found"
}
```

### 500 Internal Server Error
```json
{
  "statusCode": 500,
  "message": "Failed to create testimony",
  "error": "Internal Server Error"
}
```

---

## Testing with cURL

### Create Written Testimony
```bash
curl -X POST http://localhost:3009/testimonies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "submissionType": "written",
    "identityPreference": "public",
    "fullName": "John Doe",
    "relationToEvent": "Survivor",
    "location": "Kigali, Rwanda",
    "dateOfEvent": "1994-04-07",
    "eventTitle": "My Story of Survival",
    "eventDescription": "A brief overview",
    "fullTestimony": "This is my full written testimony with at least 50 characters to meet validation requirements...",
    "agreedToTerms": true
  }'
```

### Get All Testimonies
```bash
curl http://localhost:3009/testimonies
```

### Get My Testimonies
```bash
curl http://localhost:3009/testimonies/my-testimonies \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Update Testimony
```bash
curl -X PATCH http://localhost:3009/testimonies/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "eventTitle": "Updated Title",
    "eventDescription": "Updated description"
  }'
```

### Delete Testimony
```bash
curl -X DELETE http://localhost:3009/testimonies/1 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Frontend Integration Tips

### 1. Dynamic Form Based on Submission Type
```typescript
// Show different fields based on submission type
if (submissionType === 'written') {
  // Show fullTestimony textarea (required)
  // Hide audio/video fields
}

if (submissionType === 'audio') {
  // Show audio upload/record (required)
  // Hide fullTestimony and video fields
}

if (submissionType === 'video') {
  // Show video upload/record (required)
  // Hide fullTestimony and audio fields
}
```

### 2. Conditional Full Name Field
```typescript
// Show fullName field only if identityPreference is 'public'
if (identityPreference === 'public') {
  // Make fullName required
} else {
  // Hide or disable fullName field
}
```

### 3. File Upload Flow
```typescript
// 1. Upload file to storage (S3, Cloudinary, etc.)
// 2. Get file URL and metadata
// 3. Submit testimony with file URL

const uploadFile = async (file) => {
  // Upload to your storage service
  const response = await uploadToStorage(file);
  
  return {
    url: response.url,
    fileName: file.name,
    duration: file.duration // for audio/video
  };
};
```

### 4. Image Upload
```typescript
// Support multiple images with descriptions
const images = [
  {
    imageUrl: uploadedImageUrl,
    imageFileName: file.name,
    description: userProvidedDescription,
    order: 0
  }
];
```

---

## Best Practices

1. **File Upload**: Upload files to cloud storage (S3, Cloudinary) before creating testimony
2. **Validation**: Validate on frontend before submitting to reduce errors
3. **Error Handling**: Display user-friendly error messages from API responses
4. **Loading States**: Show loading indicators during file uploads and API calls
5. **Confirmation**: Ask for confirmation before deleting testimonies
6. **Auto-save**: Consider auto-saving drafts for long testimonies
7. **Media Preview**: Show preview of uploaded audio/video/images
8. **Terms Agreement**: Clearly display terms and require explicit agreement

---

## Security Considerations

- ✅ JWT authentication required for create/update/delete
- ✅ Users can only modify their own testimonies
- ✅ Input validation on all fields
- ✅ Max length limits to prevent DoS
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS prevention through validation
- ⚠️ File uploads should be validated on server-side
- ⚠️ Implement file size limits
- ⚠️ Scan uploaded files for malware
- ⚠️ Use signed URLs for sensitive media

---

## Next Steps

1. **File Upload Service**: Implement file upload endpoint
2. **Admin Dashboard**: Create admin routes for managing testimonies
3. **Moderation**: Add content moderation features
4. **Search**: Implement full-text search
5. **Pagination**: Add pagination for large datasets
6. **Export**: Add export functionality (PDF, CSV)
7. **Analytics**: Track testimony views and engagement
8. **Notifications**: Notify users of status changes

---

## Support

For issues or questions:
- Check Swagger docs: `http://localhost:3009/api`
- Review validation errors in response
- Check server logs for detailed errors
