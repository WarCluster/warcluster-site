var boot = require("../client/boot");
var LeaderboardView = require("../client/warcluster/views/leaderboard");

// $(window).resize(function() {
//     var test = $('body').height() - $('#header_wrapper').height() - $('#menu_wrapper').height() - $('#footer_wrapper').height();
//     $("#thframe").height(test);
// });

$(document).ready(function() {
  // var test = $('body').height() - $('#header_wrapper').height() - $('#menu_wrapper').height() - $('#footer_wrapper').height();
  // $("#thframe").height(test);
  var windowLocation = window.location.host;
  if(windowLocation !== "0.0.0.0:8118" && windowLocation !== "127.0.0.1:8118"){
    $('.login').click( function() {
      var key = prompt("The alpha server is closed! You can go to http://signup.warcluster.com if you want to know when we open our doors ;P Thanks",
        "closed alpha password");
        if (key === "hackerspace") {
          $(".login").attr("href", "/twitter/connect");
        } else {
          $(".login").attr("href", "#");
        }
    });
  }

  //Google analytics
  (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
  (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
  m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
  })(window,document,'script','//www.google-analytics.com/analytics.js','ga');
  ga('create', 'UA-42427250-1', 'warcluster.com');
  ga('send', 'pageview');
  //end of Google analytics tracking
  if (!window.WebGLRenderingContext) {
    // the browser doesn't even know what WebGL is
    window.location = "http://get.webgl.org";
  } else {
    var canvas = document.getElementById("myCanvas");
    var ctx = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!ctx) {
      // browser supports WebGL but initialization failed.
      window.location = "http://get.webgl.org/troubleshooting";
    }
  console.log('webgl-success');
  }
  $(".welcomeBtn").hide();

});

goToLeaderboard = function(e){
  var leaderboard = new LeaderboardView();
  $(".leaderboardPage").html("").append(leaderboard.el)
  leaderboard.render();
  $(".leaderboardPage").animate({top: 0},{ 
      duration: "slow", 
      easing: "easeOutBounce"
    });
  $(".welcomeBtn").show();
}
goToWelcome = function(e){
  $(".leaderboardPage").animate({top: "100%"},{ 
      duration: "slow", 
      easing: "easeOutBounce"
    });
  $(".welcomeBtn").hide();
}


