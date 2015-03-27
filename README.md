# rabbitmq-burrow
A set of ad hoc RabbitMQ performance and load testing scripts written in Node.js

# Testing publishing

 RHOST=localhost RUSER=admin RPASS=admin node publish.js 100

This will create 100 publishers, each publishing a message every 100ms.

 RHOST=admin RUSER=admin RPASS=admin node bind.js 10
 
This will create 10 connections to RabbitMQ, create a queue per each connection, and make two bindings from an exchange to that queue, and then subscribe to that queue. After these steps are complete it will disconnect all connections and measure the total time spent for these actions.

