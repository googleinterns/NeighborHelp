// limitations under the License.

package com.google.sps.servlets;

import com.google.appengine.api.datastore.DatastoreService;
import com.google.appengine.api.datastore.DatastoreServiceFactory;
import com.google.appengine.api.datastore.Entity;
import com.google.appengine.api.datastore.PreparedQuery;
import com.google.appengine.api.datastore.Query;
import com.google.appengine.api.datastore.Query.FilterOperator;
import com.google.appengine.api.datastore.Query.FilterPredicate;
import com.google.appengine.api.users.UserService;
import com.google.appengine.api.users.UserServiceFactory;
import com.google.gson.Gson;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

@WebServlet("/account")
public class UserInfoServlet extends HttpServlet {
  @Override
  public void doGet(HttpServletRequest request, HttpServletResponse response) throws IOException {
    UserService userService = UserServiceFactory.getUserService();

    if (!userService.isUserLoggedIn()) {
      response.sendRedirect(userService.createLoginURL("/account.jsp"));
      return;
    }

    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    Query query =
        new Query("UserInfo")
            .setFilter(
                new FilterPredicate(
                    "userId", FilterOperator.EQUAL, userService.getCurrentUser().getUserId()));
    PreparedQuery results = datastore.prepare(query);
    Entity entity = results.asSingleEntity();

    if (entity == null) {
      System.err.println("Unable to find the UserInfo entity based on the current user id");
      response.sendError(
          HttpServletResponse.SC_NOT_FOUND, "The requested user info could not be found");
      return;
    }
    List<String> result = new ArrayList<>();
    result.add((String) entity.getProperty("nickname"));
    result.add((String) entity.getProperty("address"));
    result.add((String) entity.getProperty("phone"));

    Gson gson = new Gson();
    String json = gson.toJson(result);
    response.setContentType("application/json;");
    response.getWriter().println(json);
  }

  @Override
  public void doPost(HttpServletRequest request, HttpServletResponse response) throws IOException {
    UserService userService = UserServiceFactory.getUserService();
    if (!userService.isUserLoggedIn()) {
      response.sendRedirect(userService.createLoginURL("/account.jsp"));
      return;
    }

    String nickname = "";
    String address = "";
    String phone = "";
    String nicknameInput = request.getParameter("nickname-input");
    String addressInput = request.getParameter("address-input");
    String phoneInput = request.getParameter("phone-input");
    String email = userService.getCurrentUser().getEmail();
    String userId = userService.getCurrentUser().getUserId();

    if (nicknameInput != null) nickname = nicknameInput.trim();
    if (addressInput != null) address = addressInput.trim();
    if (phoneInput != null) phone = phoneInput.trim();

    if (nickname.equals("") || address.equals("") || phone.equals("")) {
      System.err.println("At least one input field is empty");
      response.sendRedirect("/400.html");
      return;
    }

    DatastoreService datastore = DatastoreServiceFactory.getDatastoreService();
    Query query =
        new Query("UserInfo")
            .setFilter(new FilterPredicate("userId", FilterOperator.EQUAL, userId));
    PreparedQuery results = datastore.prepare(query);
    Entity entity = results.asSingleEntity();
    if (entity == null) {
      entity = new Entity("UserInfo");
      entity.setProperty("nickname", nickname);
      entity.setProperty("address", address);
      entity.setProperty("phone", phone);
      entity.setProperty("email", email);
      entity.setProperty("userId", userId);
      entity.setProperty("points", 0);
    } else {
      entity.setProperty("nickname", nickname);
      entity.setProperty("address", address);
      entity.setProperty("phone", phone);
    }
    datastore.put(entity);

    response.sendRedirect("/user_profile.jsp");
  }
}