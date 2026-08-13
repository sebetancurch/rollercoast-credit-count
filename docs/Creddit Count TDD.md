Sergio Betancur Chaves

## General Description

This document describes the design and implementation of the rollercoaster credit manager app. Enthusiasts can have a count of the rollercoasters that they have ride on in this app, while having the capability of making it public or private (default). It is an app with role based access control, with:  
1. Admins: Manage the coasters catalogue, create, edit or delete. Have no access to the private count of users.
2. Enthusiasts: Log in, check the catalogue to take the count of their rides, are able to type the date and an optional note of those. Have the ability to toggle private state of their coaster credits.
3. Visitors: Can view the general leaderboard of the public users and the sign in option.
Credits are counted on each distinct coaster that the user has ridded, while the count and the date of each ride is also taken.

## Background & Goals



## Architecture

![[DB Model.png]]

The Credits are going to be in a leaderboard a view in the Postgresql DB, using SQL the credits are going to dynamically be calculared: 

```sql
-- This calculates the total rides and total credits dynamically per user
SELECT 
  user_id,
  COUNT(id) as total_rides,
  COUNT(DISTINCT coaster_id) as total_credits
FROM 
  ride
GROUP BY 
  user_id;
```

```sql
CREATE VIEW public_leaderboard AS
SELECT 
  p.username AS display_name,
  COUNT(DISTINCT r.coaster_id) AS credit_count
FROM 
  profiles p
JOIN 
  ride r ON p.id = r.user_id
WHERE 
  p.leaderboard_opt_in = true
GROUP BY 
  p.username
ORDER BY 
  credit_count DESC;
```

![[System Design.png]]

UI views:
- Nav bar. If the user is not logged in (visitor) only has the option of leaderboard and login/signup. If the user is logged in as enthusiasts, it will have access to: leaderboard, personal dashboard. If logged in as admin: 
- Login and Signup view
- Public leaderboard
- Personal dashboard with the next data: user’s headline number is their credit count (unique coasters ridden), total number of rides, credits by country, manufacturer, and type, and most-ridden coaster.
- User ride history, with their crud. They can edit their rides but nobody else's.
- Coaster catalogue management with its whole crud (only for admins)

## Detailed Design

### Security Policies:

- All roles have access to public leaderboard
Visitors:
- Can only acess and see the public leaderboard view
- Sign in or sign up option with user email and password
Enthusiasts:
- Has access to a personal dashboard, its data is only accessed by the user and by no other role
- Ride history, creation edition and deletion. Only available for the user and no other role can.
Admins:
- Has no personal dashboard or ride history, those feature are only for enthusiasts (yet to determine)
- Has access to the coaster catalogue management view.
