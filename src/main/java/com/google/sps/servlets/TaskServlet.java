// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

package com.google.sps.servlets;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Key;
import com.google.appengine.api.datastore.KeyFactory;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import java.io.IOException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/** Servlet that creates new task entity and fetch saved tasks. */
@WebServlet("/tasks")
public class TaskServlet extends HttpServlet {
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // Serve the GET request sent from home page to fetch all the tasks
    return;
  }

  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    // First check whether the user is logged in
    UserService userService = UserServiceFactory.getUserService();

    if (!userService.isUserLoggedIn()) {
      response.sendRedirect(userService.createLoginURL("/"));
      return;
    }

    // Get the rewarding points from the form
    int rewardPts = getRewardingPoints(request, "reward-input");
    if (rewardPts == -1) {
      response.setContentType("text/html");
      response.getWriter().println("Please enter a valid integer in the range of 0-200");
      return;
    }

    // Get the task detail from the form input
    String taskDetail = "";
    String input = request.getParameter("task-detail-input");
    // If the input is valid, set the taskDetail value to the input value
    if (input != null) {
      taskDetail = input;
    }

    // If input task detail is empty, reject the request to add a new task and send a 400 error.
    if (taskDetail.equals("")) {
      System.err.println("The input task detail is empty");
      response.sendRedirect("/400.html");
      return;
    }

    long creationTime = System.currentTimeMillis();

    // Create an Entity that stores the input comment
    Entity taskEntity = new Entity("Task");
    taskEntity.setProperty("detail", taskDetail);
    taskEntity.setProperty("timestamp", creationTime);
    taskEntity.setProperty("reward", rewardPts);
    taskEntity.setProperty("status", "OPEN");
    taskEntity.setProperty("Owner", userService.getCurrentUser().getEmail());
    taskEntity.setProperty("Helper", "N/A");
    taskEntity.setProperty("Address", "4xxx Cxxxxx Avenue, Pittsburgh, PA 15xxx");

    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    datastore.put(taskEntity);

    // Redirect back to the user page.
    response.sendRedirect("/user_profile.jsp");
  }

  /** Return the input rewarding points by the user, or -1 if the input was invalid */
  private int getRewardingPoints(HttpServletRequest request, String inputName) {
    // Get the input from the form.
    String rewardPtsString = request.getParameter(inputName);

    // Convert the input to an int.
    int rewardPts;
    try {
      rewardPts = Integer.parseInt(rewardPtsString);
    } catch (NumberFormatException e) {
      System.err.println("Could not convert to int: " + rewardPtsString);
      return -1;
    }

    // Check that the input is within the requested range.
    if (rewardPts < 0 || rewardPts > 200) {
      System.err.println("User input is out of range: " + rewardPtsString);
      return -1;
    }

    return rewardPts;
  }

  @Override
  public void doDelete(HttpServletRequest request, HttpServletResponse response)
      throws IOException {
    String keyString = request.getParameter("key");

    Key taskKey = KeyFactory.stringToKey(keyString);

    // TODO: Handle the exceptional case where the user attempts to delete a non-existent task.
    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    datastore.delete(taskKey);

    // Redirect to the user profile page
    response.sendRedirect("/user_profile.jsp");
  }
}
