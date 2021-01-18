// client-side js
// run by the browser each time your view template is loaded

$(function() {
  $.get('/users', function(users) 
  {
    console.log("in function get users");
    users.forEach(function(user) 
    {
      $('<li></li>').text(user[0]).appendTo('ul#users');
    });
  });

  $('form').submit(function(event) {
    event.preventDefault();
    var fName = $('input#twitchName').val();
    $.post('/users?' + $.param({userName:fName}), function() {
      $('<li></li>').text(fName).appendTo('ul#users');
      $('input#twitchName').val('');
      $('input').focus();
    });
  });
});

