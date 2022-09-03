---
layout: post.liquid
title: The Conundrum of Server-Sided Bullet Collision
date: 2022-09-03
tags: ['post']
---

For a school project, I chose to create a multiplayer bullethell game-- despite having no experience with multiplayer networking. Surely it couldn't be that hard, right?

Thankfully, with resources like Gabriel Gambetta's articles on [fast-paced multiplayer](https://gabrielgambetta.com/client-server-game-architecture.html), I was making decent progress developing the game...

But how exactly would collisions in a multiplayer bullethell work? 

### THE PROBLEM

Consider this: in a bullethell game, it is essential for players to be capable of moving with [precision](https://www.youtube.com/watch?v=lHyW6Gp6UE8) to evade bullets-- if players were registered as hit because of imprecisions in the collision system, the game would be frustrating and unplayable.

### ATTEMPT #1 

Logically, the best choice to optimise for precision would then be to calculate the bullets on the client-side. If the server was involved, the latency and difference in game state (the positions of the bullets and the players) might introduce imprecision. 

However, this solution fails. Rule 1 of multiplayer networking is to never trust the client. What if the client refused to acknowledge their collisions? They would become invincible.

### ATTEMPT #2

Given that client-sided collision is off the table, what if we used server-sided collisions and attempted to compensate for the latency and difference in game state?

To compensate for the latency, we could attempt to synchronize the times when the bullets are created by the client and the server, but only handle the collisions on the server-side.

The steps to handling a bullet in this approach would be: 
1. server sends packet to client containing a time in the future
2. at this time in the future, the client and server creates a bullet
3. client and server updates the position of this bullet every tick of its lifespan
4. however, only the server detects collision

However, this solution also fails. What if the timestamp is before the client receives the message due to latency? The bullet would suddenly teleport from its spawn position, leaving the player no time to react.

Furthermore, synchronising a timestamp across client and server is a far more difficult task than it seems-- a desync of around 1-2 seconds is hard to eliminate, and this could again lead to teleporting bullets.

### ATTEMPT #3 (THE SOLUTION)

Attempt #2 failed partly because we used the server-side timestamp, which is not generous to the client's latency. What if we only used the client-side timestamp?

If the client sent a timestamp at a fixed short interval, it would be possible for the server to simulate the bullet's client-side position using the elapsed time between client timestamps.

The steps to handling a bullet in this approach would be:
1. server sends a packet to the client to spawn a bullet
2. client responds with an acknowledgement of the bullet packet, together with client timestamp
3. client is constantly sending client-side timestamps to the server 
4. using these timestamps, the server calculates elapsed time and simulates the bullet's position on the server side 
5. every time the bullet's position is simulated on the server-side, the server checks for collision

This works fairly accurately at detecting collision, and was the final solution I arrived at!