export const environment = {
  production: true,
  apiUrl: 'https://api.interviewprep-tn.me',
  interviewApiUrl: 'https://api.interviewprep-tn.me',
  trainingApiUrl: 'https://api.interviewprep-tn.me',
  mentorshipApiUrl: 'https://api.interviewprep-tn.me',
  quizApiUrl: 'https://api.interviewprep-tn.me',
  communityApiUrl: 'https://api.interviewprep-tn.me',
  resourceApiUrl: 'https://api.interviewprep-tn.me',
  kokoroUrl: "https://kokoro.yellowocean-356174e3.francecentral.azurecontainerapps.io",
   
  simli: {
    // SECURITY: a client-side key ships in the browser bundle and cannot be
    // kept secret. The committed key was removed and must be rotated at the
    // Simli dashboard. Proper fix (Wave 1 / finding F1): proxy Simli session
    // creation through the backend so the secret never reaches the browser.
    enabled: false,
    apiKey: "",
    faceId: "cace3ef7-a4c4-425d-a8cf-a5358eb0c427",
  },
  keycloak: {
    url: 'https://auth.interviewprep-tn.me',
    realm: 'myapp-realm',
    clientId: 'angular-client'
  }

};
