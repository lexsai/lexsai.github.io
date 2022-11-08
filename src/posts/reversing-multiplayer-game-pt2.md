---
layout: post.liquid
title: Reversing a Multiplayer Game Protocol (Part 2)
date: 2022-11-08
tags: ['post']
---

In the first part, we determined how the client logs in and acquires an authentication token. Using this information, I can now attempt to figure out how the client connects with game servers.

### CONNECTING

First, I will observe the connection through wireshark:

![](/images/multiplayergame2/connection0.PNG)

The client initiates a handshake, sends a series of packets and is responded by the server with a stream of data.

![](/images/multiplayergame2/connection1.PNG)

Packet #1 contains the token and the version number of the game. I can't decipher the meaning behind the last 17 bytes, but I'll assume that they remain static between connections.

![](/images/multiplayergame2/connection2.PNG)
![](/images/multiplayergame2/connection3.PNG)
![](/images/multiplayergame2/connection4.PNG)

Packets #3 and #4 are zero length ping packets, while the packets #2, #5 and #6 are small packets containing only packet length and ID. I'll assume that these also remain static between connections.

### EMULATING

Putting together a python script to send all these packets and output the tcp stream into a text file, the server responds with the data stream!

![](/images/multiplayergame2/datastream.PNG)

The connection eventually terminates, likely indicating that I need to send heartbeat packets to keep the connection alive. 

However, before I get around to sustaining a game connection, my goal will be to interpret the portion of the data stream that I have.

### THE DATA STREAM

Initially, deciphering such an immense amount of data seems impossible. But there are several logical paths to deciphering the data.

1. Reverse the client. The game client must interpret the data at some point, so reversing the section of code that processes the server's messages would tell me what the data means.

2. Gather recon on the game. If I gather specific information like entity IDs or positions, they may match up with the data in the data stream.

3. Man-in-the-middle. By proxying the connection between client and server, I can alter the data sent to the client and see their effect.

### REVERSING THE CLIENT

Using de4dot on the client, I first clean up the obfuscated variable names. 

Looking around the client for mentions of the .NET socket API, I discover that the program's functions are obfuscated with some sort of encoding and the use of delegates.

![](/images/multiplayergame2/delegates.PNG)

![](/images/multiplayergame2/delegates2.PNG)

It is probably possible to work around this obfuscation, but the time sink of doing so might be better spent on other methods.

### OTHER METHODS

First, we should clean up the data stream. If we remember the past packets we've received, we can recall that the header of each packet contains 4 bytes of packet length and 1 byte of packet id. Taking a look at the beginning of the data stream, we see that this is likewise true here:

![](/images/multiplayergame2/header.PNG)

By rewriting my python program to interpret packets from the data stream, I can now break the data stream down into individual packets:

![](/images/multiplayergame2/individual.PNG)

Much easier to read! Note that there are two packet IDs present: 0xA and 0x1.

You may also notice that I've named a few packets. Because a multiplayer game has so many packet types, I will, from this point on, not write about the reversing of packets that are trivial or uninteresting. The 'World Join' packet is an incoming packet that contains the name of the game map. The 'Ping' packet is self-explanatory.

We should begin by establishing a hypothesis. What if what we've done so far is connect to a game world, and what we're receiving is information about the game world? Then, logically, the data stream should contain information about the game objects on the screen, such as positions and entity types. 

![](/images/multiplayergame2/screen.PNG)

### RECON

Let's try the position hypothesis. Attaching Cheat Engine to the game and scanning for the player position (unknown initial value, etc etc.), we get these values:

![](/images/multiplayergame2/ce.PNG)

A common design pattern is to have x preceding y in storage. If we try to search '23 00 24 00' in the packet data, we get a hit in the packet with ID 0xA! 

![](/images/multiplayergame2/hit.PNG)

Moreover, if we attempt to extend this pattern throughout the packet, we get:

![](/images/multiplayergame2/hit2.PNG)

The sequence 01 01 seems to repeat, but the other coloured sequences don't always.

Perhaps we can determine the cause for the difference by going to the locations in-game?

![](/images/multiplayergame2/0x2324.PNG)
![](/images/multiplayergame2/0x2424.PNG)

The difference seems to be due to the tile present at that location. Then, maybe the seemingly random sequence of bytes are tile IDs? But where is the client getting the tile IDs from?

After some looking around, I notice that the server transmits XML data to the client upon opening the game:

![](/images/multiplayergame2/xmldata.PNG)

If we right click and use wireshark's 'Follow>TCP Stream' feature, we discover that the XML contains data on both tiles and entities. The tile IDs are in the XML. 0x424 corresponds to stone and 0x45e corresponds to dark wood-- which matches perfectly with our observations!

![](/images/multiplayergame2/xml.PNG)

### 0xA - 'TILE MAP PACKET'

So, we can deduce the purpose of packet 0xA. Packet 0xA is the packet that sends the tile map of the world being connected to. 

![](/images/multiplayergame2/0xA.PNG)

The light blue section is the number of tiles, the pink section is the id of each tile, the green section is the X,Y coordinates and the orange section is likely two flags or some placeholder data.

### 0x1 - 'ENTITY UPDATE PACKET'

The process to reversing packet 0x1 was similar to the process for reversing 0xA. The packet 0x1 is sent regularly and updates the locations and status of each entity in the world-- the difference between 0x1 and 0xA is that each entity can have additional data in the packet and the positions are stored with two 32 bit floating points.

### NEXT PART

Now that we can understand the update packets, our concern is now sustaining a connection and understanding the outgoing packets sent by the client. To do so, we will likely need to man-in-the-middle the connection between the client and server to see what kind of traffic is being sent to and from the server, possibly building some sort of user interface to look through the network traffic and filter unwanted packets.