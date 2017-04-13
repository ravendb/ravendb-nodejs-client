// class PatchByIndexCommand(RavenCommand):
// def __init__(self, index_name, query_to_update, patch=None, options=None):
// """
// @param index_name: name of an index to perform a query on
//     :type str
// @param query_to_update: query that will be performed
//     :type IndexQuery
// @param options: various operation options e.g. AllowStale or MaxOpsPerSec
//     :type QueryOperationOptions
// @param patch: JavaScript patch that will be executed on query results( Used only when update)
// :type PatchRequest
// @return: json
//     :rtype: dict
// """
// super(PatchByIndexCommand, self).__init__(method="PATCH")
// self.index_name = index_name
// self.query_to_update = query_to_update
// self.patch = patch
// self.options = options
//
// def create_request(self, server_node):
// if not isinstance(self.query_to_update, IndexQuery):
// raise ValueError("query must be IndexQuery Type")
//
// if self.patch:
// if not isinstance(self.patch, PatchRequest):
// raise ValueError("scripted_patch must be ScriptedPatchRequest Type")
// self.patch = self.patch.to_json()
//
// self.url = "{0}/databases/{1}/{2}".format(server_node.url, server_node.database,
//     Utils.build_path(self.index_name, self.query_to_update, self.options))
// self.data = self.patch
//
// def set_response(self, response):
// if response is None:
//     raise exceptions.ErrorResponseException("Could not find index {0}".format(self.index_name))
//
// if response.status_code != 200 and response.status_code != 202:
// raise response.raise_for_status()
// return response.json()
