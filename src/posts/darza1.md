---
layout: post.liquid
title: Reversing a Multiplayer Game Protocol - "Darza's Dominion" (Part 1)
date: 2022-09-03
tags: ['post']
---

As a beginner to reverse engineering, I was looking for real software to practice on when it hit me-- what about a multiplayer game? Multiplayer games often have anticheats to prevent users from reversing their games, and understanding how a multiplayer game works would require both reversing the executable AND the closed API used by the client to communicate with game servers.

So, this is my attempt at reversing a multiplayer game.

### THE TARGET
Darza's Dominion was initially released in 2015 as a mobile 'port' of "Realm of the Mad God", a bullethell permadeath MMO (very obscure). However, due to a rampant duping exploit, it was shut down for several years and re-released in 2022 by a small team of developers as a cross-platform game for both PC and mobile.

The game's terms of service is unavailable, the game has a player base of around 30, and they have an explicitg bug bounty program-- reversing the game for educational purposes and participating in the bug bounty program is probably ok.

![](/images/darza1/bugbounty.PNG)

### THE CLIENT
The first idea I had was to look through the client with dnspy. Perhaps I could reverse the protocol by looking at the send & receive functions.

![](/images/darza1/dnspy.PNG)

The first security measure: obfuscation. 

Because of the illegal unicode polluting the program's symbols in the IL, editing and recompiling the program's IL with dnspy would be difficult.

There is one cool observation though: a 'CryptoProvider' class with hashing methods. Interesting.

### THE NETWORK
Given that reversing the client would probably be tedious and beyond my skill level, I instead opted to look at the network. After identifying the servers of the game by clicking login and quickly tabbing over to wireshark, I set up a wireshark filter and started looking at the packets sent when logging in.

The exchange when I try logging in with correct credentials:
![](/images/darza1/wireshark.PNG)

The particular response packet when I use a correct login:
![](/images/darza1/correctlogin.PNG)

The exchange when I try logging in with incorrect credentials:
![](/images/darza1/incorrectcredentials.PNG)

The particular response packet when I use an incorrect login:
![](/images/darza1/incorrectcredentialspacket.PNG)

Given that an incorrect login gives the response packet a message of, "Incorrect Credentials", I can safely assume that the the packet of 353 bytes likely contains my login credentials. Let's see it.

![](/images/darza1/353packet.PNG)

Looking closely, a pattern is apparent:

![](/images/darza1/353packetannotated.PNG)

Two strings, each prepended by an 0xAC 0x00. If we interpret 0xAC 0x00 as little endian, we get 0xAC = 172, the exact length of each string. Hence, it probably refers to the string length.

Furthermore, if we interpret the first four bytes as little endian as well, we get 0x15D = 349, exactly 353-4. This is likely the packet size minus the 4 bytes used to store the packet size.

The fifth byte, 0x07, seems out of place. It would be safe to assume that this is a packet id of sorts.

Now, the only mystery are the strings. The fact that both strings end in an "=" sign suggests base64 encoding. 

![](/images/darza1/decryption.PNG)

However, if we try to decode it from base64, we get garbage. Could the strings potentially be encrypted? It would make sense for login credentials to be encrypted before transmission.

### DYNAMIC ANALYSIS

Recall from our earlier look into the client that there were functions in the IL named "EncryptRsaBase64", "HashSha1Base64", and "HashSha256Base64". Perhaps they were used to encrypt the login details?

Setting a breakpoint on all of these functions and attempting to login, we get a hit!

![](/images/darza1/faillogindnspy.PNG)

Inspecting the CryptoProvider instance in dnspy, we find the RSA public key with both exponent & modulus. 

![](/images/darza1/keys.PNG)

But, for both strings in the packet to always be 172 bytes, there must be some kind of padding...

Following the function calls, we arrive here:

![](/images/darza1/pkcs1.PNG)

PKCS1 is a padding scheme!

![](/images/darza1/docs.PNG)

### EMULATION

We now have all the data to construct a login packet.

Writing a python script to use the public key and PKCS1 padding standard to RSA encrypt my username and password and assemble a login packet, we get this response:

![](/images/darza1/successpython.PNG)

The server is responding with our username-- this probably means that our login was successful!

### NEXT PART

In the login response packet, there is actually a token (that I covered up earlier):

![](/images/darza1/correctlogin.PNG)

The client sends this token after initiating a handshake with another server on login:

![](/images/darza1/connection.PNG)

Likely, the login flow is as follows:

Client sends login to auth server -> auth server replies with token -> client uses token to connect with game server.

Next part will be focused around connecting with the game server-- this is all for now.