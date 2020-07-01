#!/usr/bin/env bash

d --version &>/dev/null
hasDocker=$?
d ps &>/dev/null
dockerRunning=$?

. bin/aliases.sh

# if not has docker: ci
if [ $hasDocker -eq 0 ]; then
  img=otomi/tools:1.3.2
  echo "Found docker client, assuming developer context."
  uname -a | grep -i darwin >/dev/null
  if [ $? -eq 0 ]; then
    HELM_CONFIG="$HOME/Library/Preferences/helm"
  else
    HELM_CONFIG="$HOME/.config/helm"
  fi
  if [ $dockerRunning -eq 0 ]; then
    echo "Found docker running, will use $img instead of local tooling"
    function drun() {
      # execute any kubectl command to refresh access token
      k version >/dev/null
      d run -it --rm -v $PWD:$PWD \
        -v /tmp:/tmp \
        -v ~/.kube/config:/home/app/.kube/config \
        -v $HELM_CONFIG:/home/app/.config/helm \
        -v ~/.config/gcloud:/home/app/.config/gcloud \
        -v ~/.aws:/home/app/.aws \
        -v ~/.azure:/home/app/.azure \
        -v $ENV_DIR:$PWD/env \
        -e K8S_CONTEXT=$K8S_CONTEXT \
        -e CLOUD=$CLOUD \
        -e GCLOUD_SERVICE_KEY=$GCLOUD_SERVICE_KEY \
        -e CLUSTER=$CLUSTER \
        -w $PWD $img $@
    }
    # unalias h hf_ hk aw gc &>/dev/null
    function h() { drun helm $@; }
  else
    echo "No docker daemon running. Please start and source aliases again."
  fi
fi
