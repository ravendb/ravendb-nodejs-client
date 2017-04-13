// class GetStatisticsCommand(RavenCommand):
// def __init__(self):
// super(GetStatisticsCommand, self).__init__(method="GET")
//
// def create_request(self, server_node):
// self.url = "{0}/databases/{1}/stats".format(server_node.url, server_node.database)
//
// def set_response(self, response):
// if response and response.status_code == 200:
// return response.json()
// return None
