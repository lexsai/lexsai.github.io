---
layout: post.liquid
title: Reversing a Multiplayer Game Protocol (Part 1)
date: 2022-09-03
tags: ['post']
---

As a beginner to reverse engineering, I was looking for software to practice on when it hit me-- what about a multiplayer game? Multiplayer games often have anticheats to prevent users from reversing their games, and understanding how a multiplayer game works would require both reversing the executable AND the closed API used by the client to communicate with game servers.

So, this is my attempt at reversing a multiplayer game.

### THE TARGET

The game's terms of service is unavailable, the game has a player base of around 30, and they have an explicit bug bounty program. 

![](/images/multiplayergame/bugbounty.PNG)

### THE CLIENT
The first idea I had was to look through the client with dnspy. Perhaps I could reverse the protocol by looking at the send & receive functions.

![](/images/multiplayergame/dnspy.PNG)

The client appears to be obfuscated. The random unicode characters could probably be cleaned with de4dot, but it's likely that additional obfuscation measures are present. This will significantly increase the time needed to reverse the client.

However, some of the class names do not appeared to be obfuscated. An interesting observation is the existence of a 'CryptoProvider' class with hashing methods.

### THE NETWORK
Before investing time into reversing the client, I should take a look at the network activity of the game. To identify the game servers, I click login and quickly tab over to wireshark. Then, I set up a wireshark filter and observe the packets sent when logging in.

The exchange when I try logging in with correct credentials:
![](/images/multiplayergame/wireshark.PNG)

The particular response packet when I use a correct login:
![](/images/multiplayergame/correctlogin.PNG)

The exchange when I try logging in with incorrect credentials:
![](/images/multiplayergame/incorrectcredentials.PNG)

The particular response packet when I use an incorrect login:
![](/images/multiplayergame/incorrectcredentialspacket.PNG)

Given that an incorrect login gives the response packet a message of, "Incorrect Credentials", I can safely assume that the response packet of 353 bytes likely contains my login credentials.

![](/images/multiplayergame/353packet.PNG)

Looking closely, a pattern is apparent:

![](/images/multiplayergame/353packetannotated.PNG)

Two strings, each prepended by an 0xAC 0x00. If we interpret 0xAC 0x00 as little endian, we get 0xAC = 172, the exact length of each string. Hence, it probably refers to the string length.

Furthermore, if we interpret the first four bytes as little endian, we get 0x15D = 349, exactly 353-4. This is likely the packet size minus the 4 bytes used to store the packet size.

The fifth byte, 0x07, seems out of place. It would be safe to assume that this is a packet id of sorts.

Now, the only mystery are the strings. The fact that both strings end in an "=" sign suggests base64 encoding. 

![](/images/multiplayergame/decryption.PNG)

However, if we try to decode it from base64, we get garbage. Could the strings potentially be encrypted? It would make sense for login credentials to be encrypted before transmission.

### DYNAMIC ANALYSIS

Recall from our earlier look into the client that there were functions in the IL named "EncryptRsaBase64", "HashSha1Base64", and "HashSha256Base64". Perhaps they were used to encrypt the login details?

Setting a breakpoint on all of these functions and attempting to login, we get a hit!

![](/images/multiplayergame/faillogindnspy.PNG)

Inspecting the CryptoProvider instance in dnspy, we find the RSA public key with both exponent & modulus. 

![](/images/multiplayergame/keys.PNG)

But, for both strings in the packet to always be 172 bytes, there must be some kind of padding used.

Following the function calls, we arrive here:

![](/images/multiplayergame/pkcs1.PNG)

PKCS1 is a padding scheme! Given that stepping through the code leads to this value, it is likely that PKCS1 is the padding scheme used in the encryption process.

![](/images/multiplayergame/docs.PNG)

### EMULATION

We now have all the information necessary to construct a login packet.

Writing a python script to use the public key and PKCS1 padding to RSA encrypt my username and password, I assemble a login packet and get this response:

![](/images/multiplayergame/successpython.PNG)

The server is responding with our username-- this probably means that our login was successful!

### NEXT PART

The login response packet also contains a token:

![](/images/multiplayergame/correctlogin.PNG)

The client sends this token after initiating a handshake with another server on login:

![](/images/multiplayergame/connection.PNG)

A likely login flow is that the client sends their login details to an auth server to get their token, and then they use this token as authentication to connect with game servers.

Thus, the next step will be to connect with game servers and begin reversing packets.