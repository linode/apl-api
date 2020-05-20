#!/usr/bin/env sh
# set -x

OSX=false
uname -a | grep Darwin >/dev/null
[ $? -eq 0 ] && OSX=true
decode='-d'
[ "$OSX" = true ] && decode='--decode'

set -e
set -o pipefail

KUBE_VERSION=${KUBE_VERSION:-v1.15}
kubectl="bin/kubectl-$KUBE_VERSION"
[ "$NODE_ENV" = "development" ] && kubectl=$(which kubectl)

KUBECFG_FILE_NAME="/tmp/kube/k8s-default-${NAMESPACE}-conf"
TARGET_FOLDER="/tmp/kube"
# export KUBECONFIG="$TARGET_FOLDER/config"

# exit if exists
[ -f $KUBECFG_FILE_NAME ] && echo "exists: $KUBECFG_FILE_NAME" && exit

create_target_folder() {
  printf "Creating target directory to hold files in ${TARGET_FOLDER}..."
  mkdir -p "${TARGET_FOLDER}"
  printf "done\n"
}

get_secret_name_from_service_account() {
  echo "Getting secret of service account default on ${NAMESPACE}"
  SECRET_NAME=$($kubectl get sa "default" --namespace="${NAMESPACE}" -o json | jq -r .secrets[].name)
  echo "Secret name: ${SECRET_NAME}"
}

extract_ca_crt_from_secret() {
  printf "\nExtracting ca.crt from secret..."
  $kubectl get secret --namespace "${NAMESPACE}" "${SECRET_NAME}" -o json | jq \
    -r '.data["ca.crt"]' | base64 $decode >"${TARGET_FOLDER}/ca.crt"
  printf "done\n"
}

get_user_token_from_secret() {
  printf "\nGetting user token from secret..."
  USER_TOKEN=$($kubectl get secret --namespace "${NAMESPACE}" "${SECRET_NAME}" -o json | jq -r '.data["token"]' | base64 $decode)
  printf "done\n"
}

set_kube_config_values() {
  echo "Cluster name: ${CLUSTER_NAME}"
  echo "Cluster api server: ${CLUSTER_APISERVER}"

  # Set up the config
  echo "Preparing $KUBECFG_FILE_NAME"
  echo "Setting a cluster entry in kubeconfig..."
  $kubectl config set-cluster "${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}" \
    --server="https://${CLUSTER_APISERVER}" \
    --insecure-skip-tls-verify

  echo "Setting token credentials entry in kubeconfig..."
  $kubectl config set-credentials \
    "${NAMESPACE}-${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}" \
    --token="${USER_TOKEN}"

  echo "Setting a context entry in kubeconfig..."
  $kubectl config set-context \
    "${NAMESPACE}-${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}" \
    --cluster="${CLUSTER_NAME}" \
    --user="${NAMESPACE}-${CLUSTER_NAME}" \
    --namespace="${NAMESPACE}"

  echo "Setting the current-context in the kubeconfig file..."
  $kubectl config use-context "${NAMESPACE}-${CLUSTER_NAME}" \
    --kubeconfig="${KUBECFG_FILE_NAME}"
}

create_target_folder
get_secret_name_from_service_account
extract_ca_crt_from_secret
get_user_token_from_secret
set_kube_config_values
rm ${TARGET_FOLDER}/ca.crt

printf "\nAll done! Test with:\n\n"
printf "KUBECONFIG=${KUBECFG_FILE_NAME} $kubectl get pods\n"
printf "You will probably have nothing running yet, but if you see no errors you have access.\n"
echo "TOKEN: $USER_TOKEN"
