#!/usr/bin/env sh
set -e
set -o pipefail

OSX=false
uname -a | grep Darwin >/dev/null
[ $? -eq 0 ] && OSX=true

$decode='-d'
[ $OSX ] && decode='--decode'

KUBE_VERSION=${KUBE_VERSION:-v1.15}
kubectl="bin/kubectl-$KUBE_VERSION"
[ "$NODE_ENV" = "development" ] && kubectl=$(which kubectl)


KUBECFG_FILE_NAME="/tmp/kube/k8s-default-${NAMESPACE}-conf"
TARGET_FOLDER="/tmp/kube"

# exit if exists
[ -f $KUBECFG_FILE_NAME ] && exit

create_target_folder() {
  echo -n "Creating target directory to hold files in ${TARGET_FOLDER}..."
  mkdir -p "${TARGET_FOLDER}"
  printf "done"
}

get_secret_name_from_service_account() {
  echo -e "\\nGetting secret of service account default on ${NAMESPACE}"
  SECRET_NAME=$($kubectl get sa "default" --namespace="${NAMESPACE}" -o json | jq -r .secrets[].name)
  echo "Secret name: ${SECRET_NAME}"
}

extract_ca_crt_from_secret() {
  echo -e -n "\\nExtracting ca.crt from secret..."
  $kubectl get secret --namespace "${NAMESPACE}" "${SECRET_NAME}" -o json | jq \
    -r '.data["ca.crt"]' | base64 $decode >"${TARGET_FOLDER}/ca.crt"
  printf "done"
}

get_user_token_from_secret() {
  echo -e -n "\\nGetting user token from secret..."
  USER_TOKEN=$($kubectl get secret --namespace "${NAMESPACE}" "${SECRET_NAME}" -o json | jq -r '.data["token"]' | base64 $decode)
  printf "done"
}

set_kube_config_values() {
  context=$($kubectl config current-context)
  echo -e "\\nSetting current context to: $context"

  CLUSTER_NAME=$($kubectl config get-contexts "$context" | awk '{print $3}' | tail -n 1)
  echo "Cluster name: ${CLUSTER_NAME}"

  ENDPOINT=$($kubectl config view \
    -o jsonpath="{.clusters[?(@.name == \"${CLUSTER_NAME}\")].cluster.server}")
  echo "Endpoint: ${ENDPOINT}"

  # Set up the config
  echo -e "\\nPreparing $KUBECFG_FILE_NAME"
  echo -n "Setting a cluster entry in kubeconfig..."
  # $kubectl config set-cluster "${CLUSTER_NAME}" \
  # --kubeconfig="${KUBECFG_FILE_NAME}" \
  # --server="${ENDPOINT}" \
  # --certificate-authority="${TARGET_FOLDER}/ca.crt" \
  # --embed-certs=true
  $kubectl config set-cluster "${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}" \
    --server="${ENDPOINT}" \
    --insecure-skip-tls-verify

  echo -n "Setting token credentials entry in kubeconfig..."
  $kubectl config set-credentials \
    "${NAMESPACE}-${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}" \
    --token="${USER_TOKEN}"

  echo -n "Setting a context entry in kubeconfig..."
  $kubectl config set-context \
    "${NAMESPACE}-${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}" \
    --cluster="${CLUSTER_NAME}" \
    --user="${NAMESPACE}-${CLUSTER_NAME}" \
    --namespace="${NAMESPACE}"

  echo -n "Setting the current-context in the kubeconfig file..."
  $kubectl config use-context "${NAMESPACE}-${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}"
}

create_target_folder
get_secret_name_from_service_account
extract_ca_crt_from_secret
get_user_token_from_secret
set_kube_config_values
rm ${TARGET_FOLDER}/ca.crt

echo -e "\\nAll done! Test with:"
echo "KUBECONFIG=${KUBECFG_FILE_NAME} $kubectl get pods"
echo "You will probably have nothing running yet, but if you see no errors you have access."
echo ""
echo "TOKEN: $USER_TOKEN"
