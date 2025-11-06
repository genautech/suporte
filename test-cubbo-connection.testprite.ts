// TestPrite test file for Cubbo API connection
// Run with: npx testprite run test-cubbo-connection.testprite.ts

import { test, expect } from 'testprite';

const PROXY_URL = 'https://cubbo-auth-proxy-409489811769.southamerica-east1.run.app';

test('Cubbo Auth Proxy - CORS Headers', async () => {
  // Test OPTIONS preflight request
  const preflightResponse = await fetch(PROXY_URL, {
    method: 'OPTIONS',
    headers: {
      'Origin': 'http://localhost:3000',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type'
    }
  });

  expect(preflightResponse.status).toBe(200);
  expect(preflightResponse.headers.get('access-control-allow-origin')).toBeTruthy();
  expect(preflightResponse.headers.get('access-control-allow-methods')).toContain('POST');
  expect(preflightResponse.headers.get('access-control-allow-headers')).toContain('Content-Type');
});

test('Cubbo Auth Proxy - Authentication Request', async () => {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    }
  });

  // Check CORS headers
  expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
  
  // Parse response
  const data = await response.json();
  
  // The response should either have an access_token (success) or an error (expected if credentials not set)
  if (response.ok) {
    expect(data).toHaveProperty('access_token');
    expect(typeof data.access_token).toBe('string');
    expect(data.access_token.length).toBeGreaterThan(0);
  } else {
    // If credentials are not set, we expect an error
    expect(data).toHaveProperty('error');
  }
});

test('Cubbo Auth Proxy - CORS from Localhost', async () => {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    }
  });

  const allowOrigin = response.headers.get('access-control-allow-origin');
  
  // Should allow localhost origin
  expect(allowOrigin).toMatch(/localhost|127\.0\.0\.1|\*/);
});

test('Cubbo Auth Proxy - Error Handling', async () => {
  const response = await fetch(PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Origin': 'http://localhost:3000'
    }
  });

  // Even errors should have CORS headers
  expect(response.headers.get('access-control-allow-origin')).toBeTruthy();
  
  const data = await response.json();
  
  // Response should be valid JSON
  expect(data).toBeInstanceOf(Object);
});



