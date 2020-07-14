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

package com.google.neighborgood.servlets;

import static com.google.appengine.api.datastore.FetchOptions.Builder.withLimit;
import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.*;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import com.google.appengine.tools.development.testing.LocalDatastoreServiceTestConfig;
import com.google.appengine.tools.development.testing.LocalServiceTestHelper;
import com.google.appengine.tools.development.testing.LocalUserServiceTestConfig;
import com.google.common.collect.ImmutableMap;
import java.io.*;
import javax.servlet.http.*;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.junit.runners.JUnit4;

/** Unit test on the MyTaskServlet file */
@RunWith(JUnit4.class)
public final class MyTaskServletTest {

  /* Set up the test environment with Datastore and UserService and simulate the situation
   * that the user is logged in as admin, has a specific email and userID.
   */
  private LocalServiceTestHelper helper =
      new LocalServiceTestHelper(
              new LocalDatastoreServiceTestConfig(), new LocalUserServiceTestConfig())
          .setEnvIsAdmin(true)
          .setEnvIsLoggedIn(true)
          .setEnvEmail("leonardzhang@google.com")
          .setEnvAuthDomain("1234567890")
          .setEnvAttributes(
              ImmutableMap.of(
                  "com.google.appengine.api.users.UserService.user_id_key", "1234567890"));

  private UserService userService;
  private DatastoreService ds;
  private HttpServletRequest request;
  private HttpServletResponse response;
  private Entity userEntity;

  @Before
  public void setUp() {
    helper.setUp();
    userService = UserServiceFactory.getUserService();
    ds = DatastoreServiceFactory.getDatastoreService();
    request = mock(HttpServletRequest.class);
    response = mock(HttpServletResponse.class);
    userEntity = new Entity("UserInfo", "1234567890");
    userEntity.setProperty("nickname", "Leonard");
    userEntity.setProperty("address", "xxx");
    userEntity.setProperty("phone", "xxx");
    userEntity.setProperty("email", "leonardzhang@google.com");
    userEntity.setProperty("userId", "1234567890");
    userEntity.setProperty("country", "US");
    userEntity.setProperty("zipcode", "15213");
    userEntity.setProperty("points", 0);
    ds.put(userEntity);

    // Add 3 dummy task entities to datastore
    String[] status_array = {"IN PROGRESS", "COMPLETE: AWAIT VERIFICATION", "COMPLETE"};
    for (int i = 0; i < 3; i++) {
      String status = status_array[i];
      Entity taskEntity = new Entity("Task", userEntity.getKey());
      taskEntity.setProperty("detail", "Test task");
      taskEntity.setProperty("timestamp", 123);
      taskEntity.setProperty("reward", 50);
      taskEntity.setProperty("status", status);
      taskEntity.setProperty("Owner", "1234567890");
      taskEntity.setProperty("Helper", "1234567890");
      taskEntity.setProperty("Address", "xxx");
      taskEntity.setProperty("zipcode", "15213");
      taskEntity.setProperty("country", "US");
      taskEntity.setProperty("category", "misc");

      ds.put(taskEntity);
    }
  }

  @After
  public void tearDown() {
    helper.tearDown();
  }

  @Test
  public void testEnvironmentTest() {
    // Test the UserService feature
    assertTrue(userService.isUserAdmin());
    assertTrue(userService.isUserLoggedIn());

    // Test the DataStore feature
    assertEquals(3, ds.prepare(new Query("Task")).countEntities(withLimit(10)));
    assertEquals(1, ds.prepare(new Query("UserInfo")).countEntities(withLimit(10)));
  }

  @Test
  public void needHelpDoGetTest() throws IOException {
    when(request.getParameter("keyword")).thenReturn("Owner");
    when(request.getParameter("complete")).thenReturn("True");

    StringWriter stringWriter = new StringWriter();
    PrintWriter writer = new PrintWriter(stringWriter);
    when(response.getWriter()).thenReturn(writer);

    new MyTaskServlet().doGet(request, response);

    // After sending the GET request, the doGet function should output the json string
    writer.flush();
    assertTrue(
        stringWriter
            .toString()
            .contains("\"status\":\"COMPLETE: AWAIT VERIFICATION\",\"reward\":50"));

    // Finally, ensure that the servlet file has set the content type to json
    verify(response).setContentType("application/json;");
  }
}