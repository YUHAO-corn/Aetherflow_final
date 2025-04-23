import { GoogleAuthProvider, signInWithCredential, getAuth, onAuthStateChanged, signOut, linkWithCredential } from 'firebase/auth';
import { getFirebaseAuth, mapFirebaseUser } from '../services/auth/firebase'; // Corrected import path based on file search results
import { User } from '../services/auth/types'; // Import User type if not already present

/**
 * Handles the LOGIN_WITH_GOOGLE message by initiating the Google OAuth flow
 * using chrome.identity and signing into Firebase upon success.
 * 
 * @param payload - The message payload (not used in this handler).
 * @param sender - The sender of the message (not used directly here but useful for context).
 * @param sendResponse - Callback function to send the response back to the caller.
 */
export async function handleLoginWithGoogle(
  payload: { isAnonymousUser?: boolean },
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
): Promise<void> {
  console.log('[Background - authHandler] Received LOGIN_WITH_GOOGLE request');
  try {
    // Use chrome.identity API for Google login
    console.log('[Background - authHandler] Starting Google auth flow via chrome.identity...');
    
    // Replace with your Firebase project's OAuth Client ID
    // TODO: Consider moving this ID to a configuration file or environment variable
    const clientId = '423266303314-7f3n7s17c70o1vptv3ahnl78g7b5dchd.apps.googleusercontent.com'; 
    
    // Specify required scopes
    const scopes = [
      'profile', 
      'email', 
      'https://www.googleapis.com/auth/userinfo.profile', 
      'https://www.googleapis.com/auth/userinfo.email'
    ];
    
    // Build the authentication URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('response_type', 'token'); 
    const redirectUri = chrome.identity.getRedirectURL();
    console.log('[Background - authHandler] Generated Redirect URI:', redirectUri);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('scope', scopes.join(' '));
    
    // Launch the web auth flow
    chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive: true // Requires user interaction
    }, async (responseUrl) => {
      // Check for errors during the auth flow (e.g., user cancellation)
      if (chrome.runtime.lastError) {
        console.error('[Background - authHandler] Authentication error:', chrome.runtime.lastError);
        sendResponse({
          success: false,
          error: {
            code: 'auth/identity-error',
            message: chrome.runtime.lastError.message || 'Authentication flow error'
          }
        });
        return;
      }
      
      // Check if the response URL is missing (e.g., window closed)
      if (!responseUrl) {
        console.error('[Background - authHandler] Auth process cancelled or empty URL returned.');
        sendResponse({
          success: false,
          error: {
            code: 'auth/cancelled',
            message: 'Authentication process cancelled or failed to complete.'
          }
        });
        return;
      }
      
      // Process the successful response
      try {
        console.log('[Background - authHandler] Successfully obtained auth response.');
        
        // Extract the access token from the redirect URL's hash
        const url = new URL(responseUrl);
        const params = new URLSearchParams(url.hash.substring(1)); // Remove the '#'
        const accessToken = params.get('access_token');
        
        if (!accessToken) {
          throw new Error('Failed to extract access token from the response URL.');
        }
        
        console.log('[Background - authHandler] Successfully obtained access token.');
        
        // Create Firebase credential using the access token
        // The ID token (first argument) is null when using OAuth access tokens
        const credential = GoogleAuthProvider.credential(null, accessToken); 
        
        // --- Link or Sign In Logic --- 
        console.log('[Background - authHandler] Checking if user is anonymous for linking...');
        const auth = getFirebaseAuth(); // Get the initialized Firebase Auth instance
        const currentUser = auth.currentUser;
        const isAnonymous = payload?.isAnonymousUser; // Check the flag from the payload
        
        let userCredential;
        
        if (isAnonymous && currentUser && currentUser.isAnonymous) {
          // If the frontend indicated an anonymous user, and we confirm it here,
          // attempt to link the Google credential to the existing anonymous account.
          console.log('[Background - authHandler] Attempting to link Google credential to anonymous user:', currentUser.uid);
          try {
            userCredential = await linkWithCredential(currentUser, credential);
            console.log('[Background - authHandler] Successfully linked Google credential to anonymous user.');
          } catch(linkError: any) {
            console.error('[Background - authHandler] Failed to link Google credential:', linkError.code, linkError.message);
            
            // --- Auto Sign-in Logic for Existing Google Account ---
            if (linkError.code === 'auth/credential-already-in-use') {
              console.log('[Background - authHandler] Google credential already in use detected. Attempting standard sign-in...');
              try {
                // Step 1: Sign out the anonymous user silently
                await signOut(auth); // Use the existing auth instance
                console.log('[Background - authHandler] Anonymous user signed out successfully.');
                
                // Step 2: Attempt to sign in with the *same* Google credential
                console.log('[Background - authHandler] Attempting sign-in with existing Google credential...');
                // Re-get auth instance just in case signout affected it (though usually not needed)
                const freshAuth = getFirebaseAuth(); 
                userCredential = await signInWithCredential(freshAuth, credential); 
                console.log('[Background - authHandler] Successfully signed in existing user with Google after conflict.');
                // *** Let the normal success flow handle the response ***
              } catch (signInError: any) {
                 // Handle errors during the sign-out or sign-in attempt
                 console.error('[Background - authHandler] Error during automatic Google sign-in after conflict:', signInError);
                 sendResponse({
                    success: false,
                    error: {
                      code: signInError.code || 'auth/auto-signin-error',
                      message: signInError.message || 'An error occurred while trying to log you into your existing Google account. Please try logging in directly.'
                    }
                 });
                 return; // Stop execution after sending error response
              }
            } else {
              // If the linking error was NOT 'credential-already-in-use', send the original linking error back
              sendResponse({
                success: false,
                error: {
                  code: linkError.code || 'auth/link-error',
                  message: linkError.message || 'Failed to link Google account.'
                }
              });
              return; // Stop execution after sending error response
            }
          }
        } else {
          // If not anonymous, or inconsistency detected, proceed with normal sign-in.
          console.log('[Background - authHandler] Proceeding with normal Google sign-in...');
          userCredential = await signInWithCredential(auth, credential);
        console.log('[Background - authHandler] Firebase sign-in successful.');
        }
        
        // --- End Link or Sign In Logic ---
        
        // Map the Firebase user object to our application's user format
        const appUser = mapFirebaseUser(userCredential.user);
        
        // Send the successful response with user data
        sendResponse({ success: true, user: appUser });
        console.log('[Background - authHandler] User information sent after link/sign-in.');
        
      } catch (error: any) {
        // Handle errors during token processing or Firebase sign-in/linking
        console.error('[Background - authHandler] Error processing auth response or during Firebase operation:', error);
        sendResponse({
          success: false,
          error: {
            code: error.code || 'auth/unknown',
            message: error.message || 'An unknown error occurred while processing the auth response or signing in.'
          }
        });
      }
    });
    
  } catch (error: any) {
    // Handle errors encountered before launching the auth flow
    console.error('[Background - authHandler] Error initiating auth flow:', error);
    sendResponse({
      success: false,
      error: {
        code: error.code || 'auth/unknown',
        message: error.message || 'An unknown error occurred while initiating the auth flow.'
      }
    });
  }
  
  // Note: We don't return true here because sendResponse is handled within the 
  // launchWebAuthFlow callback, which is inherently asynchronous.
  // The message listener in listeners.ts should return true to keep the channel open.
}

/**
 * Checks the current Firebase authentication state.
 * Responds with the user object if logged in, otherwise indicates no user.
 * 
 * @param payload - The message payload (not used in this handler).
 * @param sender - The sender of the message.
 * @param sendResponse - Callback function to send the response back.
 */
export function handleCheckAuthState(
  payload: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
): void { // This can be sync if we check current user directly
  console.log('[Background - authHandler] Received CHECK_AUTH_STATE request');
  try {
    const auth = getFirebaseAuth(); // Use existing helper to get auth instance
    const currentUser = auth.currentUser;

    if (currentUser) {
      console.log('[Background - authHandler] User is logged in:', currentUser.uid);
      const appUser = mapFirebaseUser(currentUser); // Map to consistent user format
      sendResponse({ success: true, user: appUser });
    } else {
      console.log('[Background - authHandler] No user is currently logged in.');
      sendResponse({ success: true, user: null }); // Indicate no user is logged in
    }
  } catch (error: any) {
    console.error('[Background - authHandler] Error checking auth state:', error);
    sendResponse({
      success: false,
      user: null,
      error: {
        code: error.code || 'auth/check-state-failed',
        message: error.message || 'Failed to check authentication state.'
      }
    });
  }
  // Since we access auth.currentUser directly, this is synchronous.
  // No need for the listener to return true, unless getFirebaseAuth itself becomes async in future.
}

/**
 * Handles the LOGOUT message by signing the user out of Firebase.
 * 
 * @param payload - The message payload (not used in this handler).
 * @param sender - The sender of the message.
 * @param sendResponse - Callback function to send the response back.
 */
export async function handleLogout(
  payload: any, 
  sender: chrome.runtime.MessageSender, 
  sendResponse: (response?: any) => void
): Promise<void> {
  console.log('[Background - authHandler] Received LOGOUT request');
  try {
    const auth = getFirebaseAuth();
    await signOut(auth);
    console.log('[Background - authHandler] User successfully signed out.');
    sendResponse({ success: true });
  } catch (error: any) {
    console.error('[Background - authHandler] Error signing out:', error);
    sendResponse({
      success: false,
      error: {
        code: error.code || 'auth/signout-failed',
        message: error.message || 'Failed to sign out.'
      }
    });
  }
  // sendResponse is called asynchronously after signOut completes.
  // The listener in listeners.ts *must* return true for this handler.
}

// --- Helper Functions (Example - Define or import mapFirebaseUser) ---

/**
 * Maps a Firebase User object to the application's user format.
 * Replace with your actual implementation.
 *
 * @param firebaseUser - The user object from Firebase Authentication.
 * @returns The user object in the application's format.
 */
/*
function mapFirebaseUser(firebaseUser: any): AppUser { // Replace AppUser with your user type
    if (!firebaseUser) {
        return null; // Or handle appropriately
    }
    console.log('[AuthHandler] Mapping Firebase user:', firebaseUser.uid);
    // Example mapping: Adjust according to your AppUser structure
    return {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
        // Add any other relevant fields
        emailVerified: firebaseUser.emailVerified,
        providerId: firebaseUser.providerData?.[0]?.providerId || 'unknown',
        // You might want to store the access token or ID token if needed later,
        // but be cautious about storing sensitive tokens persistently.
        // accessToken: firebaseUser.stsTokenManager?.accessToken, // Example, handle securely
        // idToken: await firebaseUser.getIdToken(), // Example, handle securely
    };
}

// Define your application's user type (example)
interface AppUser {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    emailVerified: boolean;
    providerId: string;
    // other fields...
}
*/
 