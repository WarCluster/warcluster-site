require('shelljs/global');
exec('ssh -p 7022 owl@kiril.eu 
		"cd ~/warcluser-site;
		forever stop /home/owl/warcluster-site/warcluster-staging.js
		git pull origin master; 
		forever start /home/owl/warcluster-site/warcluster-staging.js"')