# Create Custom Token Cloud Run Function

This Cloud Run function provides an HTTP endpoint (`/api/create-custom-token`) that:

1.  Accepts a Firebase ID Token via a POST request.
2.  Verifies the ID Token using the Firebase Admin SDK.
3.  If the ID Token is valid, creates a Firebase Custom Token for the corresponding user.
4.  Returns the Custom Token to the caller (the website frontend).

This allows the website to securely log in a user based on the authentication established in the Chrome extension, enabling seamless sign-on. 